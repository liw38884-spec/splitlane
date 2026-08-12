import { ImageResponse } from "next/og";

export const alt = "SplitLane USDC group tab dashboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ background: "#f4f6f8", color: "#151719", display: "flex", height: "100%", padding: 64, width: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        <div style={{ alignItems: "center", display: "flex", fontSize: 30, fontWeight: 700 }}>
          <span style={{ alignItems: "center", background: "#1557ff", color: "white", display: "flex", height: 50, justifyContent: "center", marginRight: 18, width: 50 }}>S</span>
          SplitLane
        </div>
        <div style={{ display: "flex", flex: 1, marginTop: 58 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 450 }}>
            <div style={{ color: "#1557ff", fontSize: 21 }}>USDC GROUP TABS</div>
            <div style={{ fontSize: 66, fontWeight: 700, lineHeight: 1.02, marginTop: 15 }}>Settle together. Pay directly.</div>
          </div>
          <div style={{ background: "white", border: "2px solid #dfe3e8", display: "flex", flex: 1, flexDirection: "column", marginLeft: 72, padding: 34 }}>
            <div style={{ display: "flex", fontSize: 25, justifyContent: "space-between" }}><b>Lisbon house</b><span>186.50 USDC</span></div>
            <div style={{ background: "#e6e9ed", display: "flex", height: 12, marginTop: 38 }}><span style={{ background: "#20a36b", height: 12, width: "67%" }} /></div>
            <div style={{ display: "flex", fontSize: 21, justifyContent: "space-between", marginTop: 34 }}><span>2 of 3 paid</span><b style={{ color: "#20a36b" }}>67%</b></div>
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
