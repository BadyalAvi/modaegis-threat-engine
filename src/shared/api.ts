export type RadarResponse = {
  type: 'radar_data';
  postId: string;
  spamCount: number;
  threatLevel: 'Low' | 'Medium' | 'High';
  username: string;
};

export type ErrorResponse = {
  status: 'error';
  message: string;
};