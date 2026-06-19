import { useState } from 'react';

const userStatusUpdates: { [userId: number]: boolean } = {};

export const useUserStatus = () => {
  const [, forceUpdate] = useState(0);

  const updateUserStatus = (userId: number, isActive: boolean) => {
    userStatusUpdates[userId] = isActive;
    forceUpdate(prev => prev + 1);
  };

  const getUserStatus = (userId: number, originalStatus: boolean) => {
    return userStatusUpdates[userId] !== undefined ? userStatusUpdates[userId] : originalStatus;
  };

  return { updateUserStatus, getUserStatus };
};