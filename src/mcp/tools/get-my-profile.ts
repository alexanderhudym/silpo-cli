import type { Profile } from "../entities/profile.js";

export const GET_MY_PROFILE = "silpo_get_my_profile";

export type GetMyProfileResult = {
  success: boolean;
  profile: Profile;
};
