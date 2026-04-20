import { fetchMyChildren } from "@/lib/actions/goals-habits";
import ParentGoalsClient from "./ParentGoalsClient";

export const revalidate = 0;

export default async function ParentGoalsPage() {
    const { data: children } = await fetchMyChildren();

    return (
        <div className="max-w-5xl mx-auto pb-12">
            <ParentGoalsClient childrenList={children || []} />
        </div>
    );
}
