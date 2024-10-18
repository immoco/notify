const express = require('express');
const bodyParser = require('body-parser');
const webPush = require('web-push');
const admin = require('firebase-admin');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();


const app = express();
const port = process.env.PORT || 3001;

// Initialize Firebase Admin SDK

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const publicVapidKey = process.env.VAPID_PUBLIC_KEY
const privateVapidKey = process.env.VAPID_PRIVATE_KEY

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

app.use(cors());
app.use(bodyParser.json());

// VAPID keys


webPush.setVapidDetails(
  'mailto:immocompany01@example.com',
  publicVapidKey,
  privateVapidKey
);

// Route to subscribe to push notifications
app.post('/subscribe', async (req, res) => {
  const subscriptionData = req.body;

  try {
      const subscriptionsRef = db.collection('subscribedUsers');

      // Check if a subscription with the same endpoint already exists
      const existingSubscription = await subscriptionsRef
          .where('device_id', '==', subscriptionData.device_id)
          .get();

      if (!existingSubscription.empty) {
          // Update remindState for each document
      const updatePromises = existingSubscription.docs.map(doc => {
        return doc.ref.update({ 'reminder_state': true }); // Update the remindState field
      });

    // Wait for all update operations to complete
       await Promise.all(updatePromises);

      return res.status(200).json({ message: 'Subscription revived for this device.' });
      }

      // Save new subscription to Firestore
      await subscriptionsRef.add(subscriptionData);

      res.status(201).json({ message: 'Subscription saved!' });
  } catch (error) {
      console.log(error)
      res.status(500).json({ message: 'Error saving subscription', error });
  }
});


app.post('/unsubscribe', async (req, res) => {
  const deviceData = req.body;

  try {
      const subscriptionsRef = db.collection('subscribedUsers');

      // Find subscription by endpoint
      const snapshot = await subscriptionsRef
          .where('device_id', '==', deviceData.device_id)
          .get();

      if (snapshot.empty) {
          return res.status(404).json({ message: 'Subscription not found' });
      }

      // Update remindState for each document
      const updatePromises = snapshot.docs.map(doc => {
        return doc.ref.update({ 'reminder_state': false }); // Update the remindState field
      });

    // Wait for all update operations to complete
    await Promise.all(updatePromises);

      res.status(200).json({ message: 'Subscription removed!' });
  } catch (error) {
    console.log("Un",error)
      console.error('Error unsubscribing:', error);
      res.status(500).json({ message: 'Error unsubscribing', error });
  }
});



// Function to send a notification
const sendNotification = (subscription, data) => {
  const payload = JSON.stringify(data);
  webPush.sendNotification(subscription, payload)
    .then(() => console.log('Notification sent successfully'))
    .catch(error => {
      console.log(error);
      console.error('Error sending notification:', error)
    });
};

// Morning Meal
cron.schedule('30 01 * * *', async () => {
  console.log('Checking for meal notifications...');

  try {
    const usersRef = db.collection('subscribedUsers');
    const snapshot = await usersRef.where('reminder_state', '==', true).get();

    snapshot.forEach(doc => {
      const user = doc.data();
      // Check if it's time for breakfast, lunch, or dinner
      const data = { title: 'Breakfast Reminder', body: `Hello ${user.displayName}, It’s time for breakfast!` };
      sendNotification(user.subscription, data);
    });

  } catch (error) {
    console.error('Error checking meal times:', error);
  }
});

// Lunch Meal
cron.schedule('30 6 * * *', async () => {
  console.log('Checking for meal notifications...');

  try {
    const usersRef = db.collection('subscribedUsers');
    const snapshot = await usersRef.where('reminder_state', '==', true).get();

    snapshot.forEach(doc => {
      const user = doc.data();
      // Check if it's time for breakfast, lunch, or dinner
      const data = { title: 'Lunch Reminder', body: `Hello ${user.displayName}, It’s time for lunch!` };
      sendNotification(user.subscription, data);
    });

  } catch (error) {
    console.error('Error checking meal times:', error);
  }
});

// Dinner Meal
cron.schedule('30 14 * * *', async () => {
    console.log('Checking for meal notifications...');
  
    try {
      const usersRef = db.collection('subscribedUsers');
      const snapshot = await usersRef.where('reminder_state', '==', true).get();

  
      snapshot.forEach(doc => {
        const user = doc.data();
        // Check if it's time for breakfast, lunch, or dinner
        const data = { title: 'Dinner Reminder', body: `Hello ${user.displayName} It’s time for dinner!` };
        sendNotification(user.subscription, data);
      });
  
    } catch (error) {
      console.error('Error checking meal times:', error);
    }
  });

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

