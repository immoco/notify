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

  try {
      const subscriptionsRef = db.collection('subscribedUsers');

      // Check if a subscription with the same endpoint already exists
      const existingSubscription = await subscriptionsRef
          .where('endpoint', '==', subscription.endpoint)
          .get();

      if (!existingSubscription.empty) {
          return res.status(409).json({ message: 'Subscription already exists for this device.' });
      }

      // Save new subscription to Firestore
      await subscriptionsRef.add(subscription);

      res.status(201).json({ message: 'Subscription saved!' });
  } catch (error) {
      res.status(500).json({ message: 'Error saving subscription', error });
  }
});


// Route to unsubscribe (delete a subscription)
app.post('/unsubscribe', async (req, res) => {
  const { email } = req.body;  // Assuming you're using email to identify the user

  try {
    // Reference to the subscribedUsers collection
    const subscriptionsRef = db.collection('subscribedUsers');

    // Query for the document where the email matches
    const snapshot = await subscriptionsRef.where('email', '==', email).get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No subscription found for this email.' });
    }

  // Delete all matching documents (should be one in this case)
  const deletePromises = snapshot.docs.map(doc => doc.ref.delete());
  await Promise.all(deletePromises);


    res.status(200).json({ message: 'Subscription deleted successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting subscription', error });
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
cron.schedule('00 07 * * *', async () => {
  console.log('Checking for meal notifications...');

  try {
    const usersRef = db.collection('subscribedUsers');
    const snapshot = await usersRef.get();

    snapshot.forEach(doc => {
      const user = doc.data();
      // Check if it's time for breakfast, lunch, or dinner
      const data = { title: 'Breakfast Reminder', body: 'It’s time for breakfast!' };
      sendNotification(user.subscription, data);
    });

  } catch (error) {
    console.error('Error checking meal times:', error);
  }
});

// Dinner Meal
cron.schedule('29 19 * * *', async () => {
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

