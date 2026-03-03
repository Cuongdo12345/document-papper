/**
 * 
 */

import { Counter } from "../../models/counter.model";

export const getNextSequence = async (key: string): Promise<number> => {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true,
    }
  );

  return counter.seq;
};