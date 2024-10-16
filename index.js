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
  const subscription = req.body;
  console.log(subscription);

  try {
      const subscriptionsRef = db.collection('subscribedUsers');

      // Check if a subscription with the same endpoint already exists
      // const existingSubscription = await subscriptionsRef
      //     .where('subscription.endpoint', '==', subscription.endpoint)
      //     .get();

      // if (!existingSubscription.empty) {
      //     return res.status(409).json({ message: 'Subscription already exists for this device.' });
      // }

      // Save new subscription to Firestore
      await subscriptionsRef.add(subscription);

      res.status(201).json({ message: 'Subscription saved!' });
  } catch (error) {
      console.log(error)
      res.status(500).json({ message: 'Error saving subscription', error });
  }
});


app.post('/unsubscribe', async (req, res) => {
  const { email } = req.body;

  try {
      const subscriptionsRef = db.collection('subscribedUsers');

      // Find subscription by endpoint
      const snapshot = await subscriptionsRef
          .where('email', '==', email)
          .get();

      if (snapshot.empty) {
          return res.status(404).json({ message: 'Subscription not found' });
      }

      // Delete all matching subscriptions
      const deletePromises = snapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(deletePromises);

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
    .catch(error => console.error('Error sending notification:', error));
};

// Morning Meal
cron.schedule('30 01 * * *', async () => {
  console.log('Checking for meal notifications...');

  try {
    const usersRef = db.collection('subscribedUsers');
    const snapshot = await usersRef.get();

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
cron.schedule('30 06 * * *', async () => {
  console.log('Checking for meal notifications...');

  try {
    const usersRef = db.collection('subscribedUsers');
    const snapshot = await usersRef.get();

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
cron.schedule('30 13 * * *', async () => {
    console.log('Checking for meal notifications...');
  
    try {
      const usersRef = db.collection('subscribedUsers');
      const snapshot = await usersRef.get();
  
      snapshot.forEach(doc => {
        const user = doc.data();
        // Check if it's time for breakfast, lunch, or dinner
        console.log(user)
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

