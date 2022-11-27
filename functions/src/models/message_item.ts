import {firestore} from "firebase-admin";
import Timestamp = firestore.Timestamp;

export interface MessageItem {
    message: string;
    sentBy: string;
    time: Timestamp;
}

export class ConvertMessage {
  public static toMessageItem(json: string): MessageItem {
    return JSON.parse(json);
  }

  public static messageToJson(value: MessageItem): string {
    return JSON.stringify(value);
  }
}
