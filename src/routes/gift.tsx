import { ForecastLede } from "@/components/site/ForecastLede";
import { createFileRoute } from "@tanstack/react-router";
import { DeskProcess3D } from "@/components/site/DeskProcess3D";
import { Frame, Rule } from "@/components/site/Frame";
import { EngineRail } from "@/components/site/EngineRail";
import { GiftDesk } from "@/components/site/GiftDesk";
import { Downloads } from "@/components/site/Downloads";
import { FxBoard } from "@/components/site/FxBoard";

const TITLE = "GIFT IFSC Desk — Company to Hub Routing | CorpVidesh AI";
const DESC =
  "Pick any top NSE/BSE listed entity and any of 52 global finance hubs: net worth, the 400% Rule 7 ceiling and the live-rate value landing at the hub.";

export const Route = createFileRoute("/gift")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Gift,
});

function Gift() {
  return (
    <Frame>
      <section className="mx-auto max-w-[1400px] px-6 pb-12 pt-14">
        <Rule label="GIFT IFSC automation desk" />
        <h1 className="font-display max-w-4xl text-6xl lg:text-7xl">
          Company in. Hub out. Route decided while you type.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Five hundred listed treasuries, fifty-two corridors, one determination. Net worth and the
          400% ceiling load automatically; both ends of the corridor carry their flag, their
          currency and a live exchange rate.
        </p>
        <div className="mt-12">
          <GiftDesk />
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-12">
        <ForecastLede desk="GIFT desk" focus={["cost", "drift"]} />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        <Rule label="Live FX and market clock" />
        <FxBoard />
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        <Downloads />
      </section>
      <section className="mx-auto max-w-[1400px] px-6 pb-16">
        <Rule label="Continue on the rail" />
        <div className="mb-10">
          <DeskProcess3D desk="gift" />
        </div>
        <EngineRail desk="gift" />
      </section>
    </Frame>
  );
}
