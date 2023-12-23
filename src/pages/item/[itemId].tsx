import TrashIcon from "@/components/TrashIcon";
import Layout from "@/components/layout";
import Priority from "@/components/priority";
import { getAllUsers, getCircle, getItem, removeBuyer, updatePriority } from "@/lib/db";
import { CircleWithID, ItemWithID, UserdataWithID } from "@/lib/types";
import { circleWingToString } from "@/lib/utils";
import { For } from "million/react";
import { NextPageContext } from "next";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

interface ItemProps {
  item: ItemWithID,
  circle: CircleWithID,
  users: UserdataWithID[];
}

Item.getInitialProps = async (ctx: NextPageContext): Promise<ItemProps> => {
  const { itemId } = ctx.query
  const item = await getItem(itemId as string)
  return {
    item: item,
    circle: await getCircle(item.circleId),
    users: await getAllUsers(),
  }
}

export default function Item(props: ItemProps) {
  const [processing, setProcessing] = useState(false)
  const [item, setItem] = useState<ItemWithID>(props.item)
  const [sending, setSending] = useState(false)

  return (<Layout title="購入物詳細">
    <Head>
      <title>{`${item.name} | 購入物詳細`}</title>
    </Head>
    <div className="flex flex-col">
      <div className="flex flex-row">
        <div className="text-3xl">{item.name}</div>
        <div className="text-2xl ml-4 flex items-end">{item.price}円</div>
      </div>
      <Link className="flex flex-row mt-4" href={`/circle/${props.circle.id}`}>
        <div className="text-xl">{props.circle.name}</div>
        <div className="text-xl ml-4">{props.circle.day}日目 {circleWingToString(props.circle.wing)} {props.circle.place}</div>
      </Link>
    </div>

    <div className="w-96 overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>購入者</th>
            <th>個数</th>
            <th>優先度</th>
            <th>削除</th>
          </tr>
        </thead>
        <tbody>
          {
            <For each={item.users}>{(user, i) => (
              <tr key={i}>
                <td>
                  <Link href={`/user/${user.uid}`}>
                    {props.users.find(u => u.id === user.uid)?.name}
                  </Link>
                </td>
                <td>{user.count}</td>
                <td>
                  <Priority
                    priority={user.priority}
                    onChange={async priority => {
                      setSending(true)
                      await updatePriority(item.id, user.uid, priority)
                      setItem(prevItem => {
                        prevItem.users[i].priority = priority
                        return prevItem
                      })
                      setSending(false)
                    }}
                    disabled={processing}
                    name={`priority-${i}`}
                  />
                </td>
                <td>
                  <button className="btn btn-outline btn-sm btn-square btn-ghost" onClick={e => {
                    e.preventDefault()
                    setProcessing(true)
                    removeBuyer(item.id, user.uid).then(() => {
                      setProcessing(false)
                      setItem(prev => ({
                        ...prev,
                        users: prev.users.filter(u => u.uid !== user.uid)
                      }))
                    })
                  }} disabled={processing}>
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            )}</For>
          }
        </tbody>
      </table>
    </div>
  </Layout>)
}
