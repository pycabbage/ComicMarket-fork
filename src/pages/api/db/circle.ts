import type { NextApiRequest, NextApiResponse } from 'next'
import { getAllCircles } from "@/lib/db";
import { CircleWithID } from '@/lib/types';

type ResponseData = CircleWithID[];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const circles = await getAllCircles();
  res
    .status(200)
    .json(circles)
}