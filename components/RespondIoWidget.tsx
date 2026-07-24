"use client";

import { useEffect } from "react";

const SCRIPT_ID = "respondio__widget";
const SCRIPT_SRC =
  "https://cdn.respond.io/webchat/widget/widget.js?cId=650ce179eec56be9833602a34646374";

export default function RespondIoWidget() {
  useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return null;
}
