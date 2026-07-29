import { notFound } from "next/navigation";

/** Course feature is disabled — direct URL access returns 404. */
export default function CoursePage() {
  notFound();
}
