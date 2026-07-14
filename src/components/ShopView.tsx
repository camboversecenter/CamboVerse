import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ShopScene } from "./ShopScene";
import { WalkControls } from "./WalkControls";
import type { WalkInput } from "./FirstPersonControls";
import { fulfillmentFor, formatUSD, DEMO_COUNTRIES } from "../lib/economy";
import type { Market } from "../shops";

interface OrderResult {
  orderId: string;
  country: string;
  countryName: string;
  flag: string;
  payMethod: string;
  delivery: string;
  total: number;
}

/**
 * The virtual shop experience for a heritage site: navigate a plaza of kiosks,
 * build a cart, and check out. The order is fulfilled from a merchant in the
 * visitor's own country (geo-aware) — the digital-economy PoC.
 */
export function ShopView({ market, onBack }: { market: Market; onBack: () => void }) {
  const [mode, setMode] = useState<"orbit" | "walk">("orbit");
  const [activeKiosk, setActiveKiosk] = useState<string | null>(null);
  const [nearId, setNearId] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkout, setCheckout] = useState(false);
  const [country, setCountry] = useState<string>("US");
  const [placing, setPlacing] = useState(false);
  const [order, setOrder] = useState<OrderResult | null>(null);
  const walkInput = useRef<WalkInput>({ move: { x: 0, y: 0 }, look: { dx: 0, dy: 0 } });

  // Detect the visitor's country for geo-aware fulfillment (overridable below).
  useEffect(() => {
    fetch("/api/geo")
      .then((r) => r.json())
      .then((d: { country?: string }) => d.country && setCountry(d.country))
      .catch(() => {});
  }, []);

  const kiosk = market.kiosks.find((k) => k.id === activeKiosk) ?? null;
  const count = Object.values(cart).reduce((n, q) => n + q, 0);
  const items = useMemo(
    () =>
      Object.entries(cart)
        .map(([pid, qty]) => {
          for (const k of market.kiosks) {
            const p = k.products.find((p) => p.id === pid);
            if (p) return { product: p, brand: k.brand, qty };
          }
          return null;
        })
        .filter(Boolean) as { product: Market["kiosks"][number]["products"][number]; brand: string; qty: number }[],
    [cart, market],
  );
  const total = items.reduce((s, it) => s + it.product.price * it.qty, 0);
  const fx = fulfillmentFor(country);

  const add = (pid: string) => setCart((c) => ({ ...c, [pid]: (c[pid] ?? 0) + 1 }));
  const dec = (pid: string) =>
    setCart((c) => {
      const q = (c[pid] ?? 0) - 1;
      const next = { ...c };
      if (q <= 0) delete next[pid];
      else next[pid] = q;
      return next;
    });

  const walking = mode === "walk";
  const toggleMode = () => {
    setActiveKiosk(null);
    setNearId(null);
    setMode((m) => (m === "orbit" ? "walk" : "orbit"));
  };

  const placeOrder = async () => {
    setPlacing(true);
    const body = {
      marketId: market.id,
      country,
      items: Object.entries(cart).map(([productId, qty]) => ({ productId, qty })),
    };
    try {
      const r = await fetch("/api/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await r.json()) as OrderResult;
      setOrder(d);
      setCart({});
    } catch {
      // Offline fallback: confirm locally so the demo still completes.
      setOrder({ orderId: "DEMO-LOCAL", total, ...fx });
      setCart({});
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="shop">
      <Canvas dpr={[1, 2]} shadows camera={{ position: [0, 6.5, 12], fov: 55 }} gl={{ antialias: true }}>
        <ShopScene
          market={market}
          activeKiosk={activeKiosk}
          onSelectKiosk={(id) => setActiveKiosk(id)}
          mode={mode}
          walkInput={walkInput}
          onNear={setNearId}
        />
      </Canvas>

      {walking && <WalkControls input={walkInput} />}

      <button className="backbtn" onClick={onBack}>
        ← Site
      </button>
      {!kiosk && !checkout && (
        <button className="walk-toggle" onClick={toggleMode}>
          {walking ? "⟳ Orbit" : "🚶 Walk in"}
        </button>
      )}

      {/* Cart button */}
      <button className="cart-btn" onClick={() => setCheckout(true)}>
        🛒 Cart{count > 0 && <span className="cart-count">{count}</span>}
      </button>

      {/* Walk-up prompt */}
      {walking && nearId && !activeKiosk && !checkout && (
        <button className="near-prompt" onClick={() => setActiveKiosk(nearId)}>
          {market.kiosks.find((k) => k.id === nearId)!.emoji} View{" "}
          {market.kiosks.find((k) => k.id === nearId)!.brand}
        </button>
      )}

      {/* Kiosk menu */}
      {kiosk && !checkout && (
        <div className="kiosk-menu">
          <div className="kiosk-menu-head" style={{ borderColor: kiosk.color }}>
            <div>
              <h2>
                <span className="kiosk-emoji">{kiosk.emoji}</span> {kiosk.brand}
              </h2>
              <p className="kiosk-tag">{kiosk.tagline}</p>
            </div>
            <button className="poi-close" onClick={() => setActiveKiosk(null)}>
              ✕
            </button>
          </div>
          <ul className="menu-list">
            {kiosk.products.map((p) => (
              <li key={p.id}>
                <span className="menu-emoji">{p.emoji}</span>
                <span className="menu-info">
                  <b>{p.name}</b>
                  <small>{p.desc}</small>
                </span>
                <span className="menu-price">{formatUSD(p.price)}</span>
                <button className="menu-add" onClick={() => add(p.id)}>
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cart / checkout */}
      {checkout && (
        <div className="checkout">
          <div className="poi-panel-head">
            <span className="poi-count">{order ? "Order placed" : "Your cart"}</span>
            <button className="poi-close" onClick={() => (order ? (setOrder(null), setCheckout(false)) : setCheckout(false))}>
              ✕
            </button>
          </div>

          {order ? (
            <div className="order-done">
              <p className="order-check">✓ Demo order {order.orderId}</p>
              <p>
                Fulfilled from <b>{order.flag} {order.countryName}</b> · paid via{" "}
                <b>{order.payMethod}</b> · delivery by <b>{order.delivery}</b>.
              </p>
              <p className="order-total">Total {formatUSD(order.total)}</p>
              <p className="order-note">No real charge — this is a proof-of-concept.</p>
              <button className="checkout-btn" onClick={() => (setOrder(null), setCheckout(false))}>
                Back to market
              </button>
            </div>
          ) : items.length === 0 ? (
            <p className="cart-empty">Your cart is empty. Tap a stall to order.</p>
          ) : (
            <>
              <ul className="cart-list">
                {items.map((it) => (
                  <li key={it.product.id}>
                    <span className="menu-emoji">{it.product.emoji}</span>
                    <span className="menu-info">
                      <b>{it.product.name}</b>
                      <small>{it.brand}</small>
                    </span>
                    <span className="qty">
                      <button onClick={() => dec(it.product.id)}>−</button>
                      {it.qty}
                      <button onClick={() => add(it.product.id)}>+</button>
                    </span>
                    <span className="menu-price">{formatUSD(it.product.price * it.qty)}</span>
                  </li>
                ))}
              </ul>

              <div className="fulfill">
                <div className="fulfill-row">
                  <span>Fulfilled from</span>
                  <select value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Viewing as country">
                    {DEMO_COUNTRIES.map((c) => {
                      const f = fulfillmentFor(c);
                      return (
                        <option key={c} value={c}>
                          {f.flag} {f.countryName}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <p className="fulfill-detail">
                  Pay via <b>{fx.payMethod}</b> · delivery by <b>{fx.delivery}</b>
                </p>
              </div>

              <div className="checkout-foot">
                <span className="checkout-total">Total {formatUSD(total)}</span>
                <button className="checkout-btn" onClick={placeOrder} disabled={placing}>
                  {placing ? "Placing…" : "Place demo order"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
