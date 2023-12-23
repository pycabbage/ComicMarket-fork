import TrashIcon from "@/components/TrashIcon";
import CircleFilterForm from "@/components/circleFilterForm";
import Layout from "@/components/layout";
import Priority from "@/components/priority";
import { getAllCircles, getAllItems, getUser, removeBuyer, updatePriority } from "@/lib/db";
import { CircleWithID, ItemWithID, UserdataWithID } from "@/lib/types";
import { circleToDatePlaceString, filterDeletedCircleItem, getCircleById, sortItemByDP, sortItemByPriority } from "@/lib/utils";
import { For } from "million/react";
import { NextPageContext } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

interface UserProps {
  circles: CircleWithID[];
  user: UserdataWithID;
  items: ItemWithID[];
}

User.getInitialProps = async (ctx: NextPageContext): Promise<UserProps> => {
  const { userId } = ctx.query as { userId: string }
  /**
   * このユーザーが購入した購入物のみを取得する
   */
  // const items: ItemWithID[] = (await getAllItems()).filter(item => item.users.find(u => u.uid === userId))
  return {
    circles: await getAllCircles(),
    user: await getUser(userId),
    items: await getAllItems(),
  }
}

type my_item = Omit<ItemWithID, "users"> & {
  user: ItemWithID["users"][0]
}

export default function User(props: UserProps) {
  const [processing, setProcessing] = useState(false)
  const initialItems = props.items
    .filter(i => filterDeletedCircleItem(i, props.circles))
    .filter(item => item.users.find(u => u.uid === props.user.id))
  const myItems = (
    initialItems.map(item => {
      const { users, ...oItem } = item
      const user = users.find(u => u.uid === props.user.id)
      if (user) {
        return {
          ...oItem,
          user
        }
      }
    }).filter((i): i is my_item => typeof i !== "undefined")
  )
  const [sortKey, setSortKey] = useState<"DP" | "priority-u" | "priority-d">("DP")
  const sortedItems = sortItemByDP(initialItems, props.circles)
  const [items, setItems] = useState<ItemWithID[]>(sortedItems)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    console.log("sortKey", sortKey)
    setItems(i =>
      sortKey === "DP"
        ? sortItemByDP(i, props.circles)
        : sortItemByPriority(i, props.user.id, sortKey === "priority-u")
    )
  }, [props.circles, props.user.id, sortKey])

  return (<Layout title="ユーザー詳細">
    <Head>
      <title>{`${props.user.name} | ユーザー詳細`}</title>
    </Head>
    <div className="flex flex-row">
      <div className="avatar">
        <div className="w-24 rounded-xl">
          <Image className="rounded-xl" src={props.user.photoURL!} alt={props.user.name} width={200} height={200} />
        </div>
      </div>

      <div className="flex flex-col min-h-full">
        <div className="text-2xl my-auto ml-4">{props.user.name}</div>
      </div>
    </div>

    <div className="mt-12">
      合計金額:{
        items.map(item => {
          const { price } = item
          const count = item.users.find(user => user.uid === props.user.id)?.count
          return Number(price) * Number(count ?? 0)
        }).reduce((a, b) => a + b, 0).toLocaleString()
      }円
    </div>

    <div className="mt-12">
      購入物一覧 ({items.length}件)
    </div>

    <CircleFilterForm
      circles={props.circles}
      onChange={(_circle) => {
        const circleIDs = _circle.map(c => c.id)
        const newItems = initialItems.filter(i => circleIDs.includes(i.circleId))
        setItems(newItems)
      }}
    />

    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>サークル</th>
            <th className="btn btn-sm" onClick={() => {
              setSortKey("DP")
            }}>場所</th>
            <th>購入物</th>
            <th className="btn btn-sm" onClick={() => {
              setSortKey(prev => prev === "priority-u" ? "priority-d" : "priority-u")
            }}>優先度</th>
            <th>個数</th>
            <th>単価</th>
            <th>小計</th>
            <th>購入者ID</th>
            <th>削除</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0
            ? <tr>
              <td>
                データなし
              </td>
            </tr>
            : <For each={items}>{(item, i) => <For each={item.users}>{(user, j) => user.uid == props.user.id ? (
              <tr key={`${i}-${j}`}>
                <td>
                  <Link href={`/circle/${item.circleId}`}>
                    {((): string => {
                      const circle = props.circles.find(c => c.id === item.circleId)
                      if (circle) {
                        let circleName = circle.name
                        if (circle.deleted) {
                          circleName += "(削除済み)"
                        }
                        return circleName
                      } else {
                        return "サークルが見つかりません"
                      }
                    })()}
                  </Link>
                </td>
                <td>
                  {circleToDatePlaceString(props.circles.find(c => c.id === item.circleId)!)}
                </td>
                <td>
                  <Link href={`/item/${item.id}`}>
                    {item.name}
                  </Link>
                </td>
                <td>
                  <Priority
                    priority={user.priority}
                    onChange={async (priority) => {
                      setSending(true)
                      await updatePriority(item.id, user.uid, priority)
                      setItems(prevItems => {
                        prevItems[i].users[j].priority = priority
                        return prevItems
                      })
                      setSending(false)
                    }}
                    name={`item-${i}_user-${j}`}
                  />
                </td>
                <td>{user.count}</td>
                <td>{Number(item.price).toLocaleString()}</td>
                <td>{(Number(item.price) * Number(user.count)).toLocaleString()}</td>
                <td>{user.uid}</td>
                <td>
                  <button className="btn btn-outline btn-sm btn-square btn-ghost" onClick={e => {
                    e.preventDefault()
                    setProcessing(true)
                    removeBuyer(item.id, user.uid).then(() => {
                      setProcessing(false)
                      setItems(prev => prev.map(p => p.id === item.id ? {
                        ...p,
                        users: p.users.filter(u => u.uid !== user.uid)
                      } : p))
                    })
                  }} disabled={processing}>
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ) : <></>}</For>}</For>}
        </tbody>
      </table>
    </div>
  </Layout>)
}
