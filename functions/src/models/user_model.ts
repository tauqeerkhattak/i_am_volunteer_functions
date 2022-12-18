// To parse this data:
//
//   import { Convert, UserModel } from "./file";
//
//   const userModel = Convert.toUserModel(json);

export class UserModel {
  cardImage?: string;
  dept?: string;
  email?: string;
  image?: string;
  name?: string;
  role?: string;
  token?: string;
  uid?: string;
}

