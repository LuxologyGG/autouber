/**
 * Share command metadata from a common spot to be used for both runtime
 * and registration.
 */

export const PING_COMMAND = {
  name: 'ping',
  description: 'Replies with pong.',
};

export const ORDER_COMMAND = {
  name: 'order',
  description: 'Place an Uber Eats food order.',
  options: [
    {
      type: 3, // STRING
      name: 'restaurant',
      description: 'The name or URL of the restaurant on Uber Eats.',
      required: true,
    },
    {
      type: 3, // STRING
      name: 'item',
      description: 'The food item you want to order.',
      required: true,
    },
  ],
};
