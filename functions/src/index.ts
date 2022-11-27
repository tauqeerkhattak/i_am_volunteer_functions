import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {ChatModel} from "./models/chat_model";
import {MessageItem} from "./models/message_item";
import {UserModel} from "./models/user_model";

import * as serviceAccount from "../src/service_account.json";
import {ServiceAccount} from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.cert((<ServiceAccount>serviceAccount)),
});

const db = admin.firestore();
const fcm = admin.messaging();


exports.listenToMessages = functions
    .firestore
    .document("chats/{chatId}/messages/{messageId}")
    .onCreate(async (snapshot, context) => {
      const chatId = context.params.chatId;
      const messageId = context.params.messageId;
      const chatDoc = await db.collection("chats").doc(chatId).get();
      const messageData = snapshot.data();
      const chatData = chatDoc.data();
      functions.logger.log("ChatID: ", chatId);
      functions.logger.log("MessageID: ", messageId);
      if (chatData && messageData) {
        functions.logger.log("CHAT AND MESSAGE ARE NOT EMPTY");
        const message: MessageItem = <MessageItem>messageData;
        const chat: ChatModel = <ChatModel>chatData;
        const sentTo: string[] = await getParticipants(chat);
        const sentBy: UserModel[] = chat.participantsData ? chat.participantsData.filter((user) => {
          return user.uid === message.sentBy;
        }) : [];
        if (sentBy.length > 0 && sentTo.length > 0) {
          await fcm.sendMulticast({
            tokens: sentTo.filter((uid) => {
              return uid !== sentBy[0].uid;
            }),
            notification: {
              title: sentBy[0].name,
              body: message.message,
            },
          });
        }
      }
    });

exports.sendNotification = functions.runWith({
  timeoutSeconds: 540,
  memory: "512MB",
}).https.onRequest(async (req, response) => {
  try {
    const chatDoc = await db
        .collection("chats")
        .doc("6YYXn32OLTHfCbWQTLLg")
        .get();
    const chatData: any = chatDoc.data();
    const messageDoc = await chatDoc.ref
        .collection("messages")
        .doc("It44m6RRCmKCPJX3spFG")
        .get();
    const messageData: any = messageDoc.data();
    if (messageData && chatData) {
      functions.logger.log("Message and Chat are not Empty");
      const messageItem: MessageItem = <MessageItem>messageData;
      const chatItem: ChatModel = <ChatModel>chatData;
      const sentTo: string[] = await getParticipants(chatItem);
      const sentBy: UserModel[] = chatItem.participantsData ? chatItem.participantsData.filter((user) => {
        return user.uid === messageItem.sentBy;
      }) : [];
      if (sentBy.length > 0 && sentTo.length > 0) {
        await fcm.sendMulticast({
          tokens: sentTo.filter((uid) => {
            return uid !== sentBy[0].uid;
          }),
          notification: {
            title: sentBy[0].name,
            body: messageItem.message,
          },
        });
      }
      await response.send({
        status: 200,
        message: messageItem.message,
        participants: chatItem.participants,
      });
      return;
    } else {
      await response.send({status: 202, message: "message and chat are null"});
      return;
    }
  } catch (error) {
    await response.send({status: 200, message: "ERROR: "+ error});
    return;
  }
});

exports.sendDummyNotification = functions.https.onRequest(async (req, resp) => {
  try {
    const token: string = req.body["token"];
    const title: string = req.body["title"];
    const body: string = req.body["body"];
    await sendNotification(title, body, token);
    resp.send({status: 200, message: "notification sent!"});
  } catch (e) {
    resp.send({status: 200, message: "notification not sent: "+e});
  }
});


const sendNotification = async (title: string, body:string, token: string): Promise<boolean> => {
  try {
    await fcm.send({
      token: token,
      notification: {
        title: title,
        body: body,
      },
    });
    return true;
  } catch (e) {
    console.log("Cannot Send notification to: ", token);
    return false;
  }
};

const getParticipants = async (chatItem: ChatModel): Promise<string[]> => {
  console.log("GetParticipants");
  try {
    if (chatItem) {
      console.log("Chat Item is not null");
      const uids: string[] = chatItem.participantsData ? chatItem.participantsData.map((user) => {
        return user.uid ?? "";
      }) : [];
      const participants: string[] = [];
      if (uids.length > 0) {
        for (const uid of uids) {
          console.log("Getting Data For: ", uid);
          const userDoc = await db.collection("users").doc(uid).get();
          const userData = userDoc.data();
          console.log("Gotten Data: ", userData);
          if (userData) {
            const userItem: UserModel = <UserModel>userData;
            console.log("USERDATA: ", userItem.name);
            if (userItem.token) {
              participants.push(userItem.token);
            }
          }
        }
      }
      return participants;
    } else {
      return [];
    }
  } catch (e) {
    console.log("Error getting participants: ", e);
    return [];
  }
};

exports.getUser = functions.https.onRequest(async (req, res) => {
  try {
    const uid: string = req.body["uid"];
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data();
    const user: UserModel = <UserModel>userData;
    res.send({status: 200, message: user});
  } catch (e) {
    res.send({status: 500, message: "Error"+e});
  }
});
