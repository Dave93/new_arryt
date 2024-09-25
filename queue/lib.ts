
import serviceAccount from '../firebase.json';
import { JWT } from 'google-auth-library';

export default async function getFirebaseAccessToken() {
    const jwtClient = new JWT({
        email: serviceAccount.client_email,
        key: serviceAccount.private_key,
        scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase.messaging'],
    });
    const tokens = await jwtClient.authorize();
    return tokens.access_token;

}

const accessToken = await getFirebaseAccessToken();

const message = {
    token: 'fTTqA3bdSSSHKI8CV3SXYF:APA91bGbyqQ1HJoyWPgV3H4fby-EPwmAGh45ioWvnnyC8ZKnfyxuvaK6MTa3Y4hz_KMlAvfwZxLcpaGH2abixwGiWg84jM6n1B8YHT3cK8u8h439ORH4tkrtJ0Sy0IbNAF047zetp7YE',
    notification: {
        title: "New Order Assigned",
        body: `You have been assigned a new order`,

    },
    android: {
        notification: {
            click_action: "OPEN_ORDER_DETAILS",
            // buttons: [
            //     {
            //         text: "Accept",
            //         action: "accept"
            //     },
            //     {
            //         text: "Reject",
            //         action: "reject"
            //     }
            // ]
        }
    },
    apns: {
        payload: {
            aps: {
                category: "NEW_ORDER_CATEGORY"
            }
        }
    },
    data: {
        orderId: '32b276b5-8c0c-4dce-bcf3-8c8d9322edb9',
        createdAt: '2024-09-21 20:57:46',
        type: 'accept_order',
        queue: '1'
    }
};

try {
    const response = await fetch('https://fcm.googleapis.com/v1/projects/arryt-b201e/messages:send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
    });

    if (!response.ok) {
        console.error('Failed to send push notification:', await response.text());
    } else {
        console.log('Push notification sent successfully', await response.json());
    }
} catch (error) {
    console.error('Error sending push notification:', error);
}