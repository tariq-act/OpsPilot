import type { Metadata } from "next";

import { MyWorkList } from "@/components/work/my-work-list";

export const metadata: Metadata = {
  title: "My Work",
};

export default function MyWorkPage() {
  return <MyWorkList />;
}
