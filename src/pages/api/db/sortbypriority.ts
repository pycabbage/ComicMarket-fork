/**
 * サークルごとに最も優先度の高い購入者
 */

import { getAllCircles, getAllItems } from "@/lib/db";
import { CircleWithID } from '@/lib/types';
import type { NextApiRequest, NextApiResponse } from 'next';

type ResponseData = {
  circleId: string;
  itemId: string;
  uid: string;
  count: number;
  priority: number;
}[];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const circles = await getAllCircles();
  const items = await getAllItems();
  const data = circles.flatMap(circle => {
    const res = items
      .filter(item => item.circleId === circle.id)
      .map(item => item.users.map(user => ({
        ...user,
        circleId: circle.id,
        itemId: item.id,
      })).sort((a, b) => a.priority - b.priority)[0])
    return res
  })

  res
    .status(200)
    .json(data)
}