import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {ChatModel} from "./models/chat_model";
import {MessageItem} from "./models/message_item";
import {UserModel} from "./models/user_model";

import * as serviceAccount from "../src/service_account.json";
import {ServiceAccount} from "firebase-admin";
import {EventModel} from "./models/event_model";

admin.initializeApp({
  credential: admin.credential.cert((<ServiceAccount>serviceAccount)),
});

const db = admin.firestore();
const fcm = admin.messaging();

exports.listenToEvents = functions
    .firestore
    .document("events/{eventId}")
    .onCreate(async (snapshot, context) => {
      const eventData = snapshot.data();
      console.log("EVENTID: ", context.eventId);
      const event = Object.assign(new EventModel(), eventData);
      const usersQuery = await db.collection("users").get();
      const tokens: string[] = [];
      for (const userDoc of usersQuery.docs) {
        const user: UserModel = Object.assign(new UserModel(), userDoc.data());
        if (user.token && user.role != "admin") {
          tokens.push(user.token);
        }
      }
      console.log("TOKENS LENGTH: ", tokens.length);
      if (tokens.length != 0) {
        await fcm.sendMulticast({
          tokens: tokens,
          notification: {
            title: "New Event has been created!",
            body: event.title + " by " + event.adminName,
          },
        });
      }
    });


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
          const temp: string[] = sentTo.filter((uid) => {
            return uid !== message.sentBy;
          });
          await fcm.sendMulticast({
            tokens: temp,
            notification: {
              title: sentBy[0].name,
              body: message.message,
            },
          });
        }
      }
    });

const getParticipants = async (chatItem: ChatModel): Promise<string[]> => {
  console.log("GetParticipants");
  try {
    if (chatItem) {
      console.log("Chat Item is not null");
      const participants: string[] = [];
      const uids: string[] = chatItem.participants ? chatItem.participants : [];
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
