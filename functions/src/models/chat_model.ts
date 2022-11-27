import {UserModel} from "./user_model";

export interface ChatModel {
    isAdminChat?: boolean;
    participants?: string[];
    participantsData?: UserModel[];
}
