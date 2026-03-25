"use client";

import { useState, useCallback } from "react";
import { useAccount, useSendTransaction, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

// Hyperbeat design tokens
const HB_BG      = "#0C0C0C";
const HB_CARD    = "#141414";
const HB_CARD2   = "#1A1A1A";
const HB_BORDER  = "#242424";
const HB_GREEN   = "#00D26A";
const HB_TEXT    = "#F0F0F0";
const HB_MUTED   = "#888888";
const HB_MUTED2  = "#444444";
const A_ORANGE   = "#FF6640";

type DemoMode    = "deposit" | "wallet";
type DepositStep = "idle" | "loading" | "waiting" | "polling" | "filled" | "error";
type WalletStep  = "idle" | "quoting" | "signing" | "bridging" | "done";

const USDC_BY_CHAIN: Record<string, string> = {
  "42161": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  "1":     "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "8453":  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};
const USDH_ADDRESS = "0x2000000000000000000000000000000000000168";
const HL_CHAIN_ID  = "1337";

const SOURCE_CHAINS = [
  { label: "Arbitrum", id: "42161" },
  { label: "Ethereum", id: "1" },
  { label: "Base",     id: "8453" },
];

function shortAddr(a: string) { return a.slice(0, 10) + "..." + a.slice(-8); }
function formatAmt(n: string) {
  const num = parseFloat(n);
  if (isNaN(num)) return n;
  if (Number.isInteger(num)) return num.toLocaleString("en-US");
  const str = num.toFixed(6).replace(/\.?0+$/, "");
  return parseFloat(str).toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function AcrossLogo({ size = 20 }: { size?: number }) {
  return (
    <img
      src="/across-logo.png"
      alt="Across"
      width={size}
      height={size}
      style={{ verticalAlign: "middle", display: "inline-block", flexShrink: 0, borderRadius: "50%" }}
    />
  );
}

function HyperbeatWordmark({ height = 32 }: { height?: number }) {
  // SVG viewBox is square (1068x1068) — must set explicit width for the full horizontal wordmark
  const width = Math.round(height * 3.5);
  return (
    <img
      src="/hyperbeat-logo.svg"
      alt="Hyperbeat"
      width={width}
      height={height}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    />
  );
}

// Primitives
function FL({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: HB_MUTED, marginBottom: 5, letterSpacing: "0.04em", textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

function DInput({ value, onChange, mono = false, placeholder }: { value: string; onChange: (v: string) => void; mono?: boolean; placeholder?: string }) {
  const [f, setF] = useState(false);
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setF(true)}
      onBlur={() => setF(false)}
      style={{
        width: "100%", boxSizing: "border-box",
        background: HB_CARD2,
        border: `1px solid ${f ? HB_GREEN + "80" : HB_BORDER}`,
        borderRadius: 8, color: HB_TEXT, fontSize: 13,
        fontFamily: mono ? "monospace" : "inherit",
        padding: "9px 12px", outline: "none",
        boxShadow: f ? `0 0 0 3px ${HB_GREEN}14` : "none",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    />
  );
}

function PBtn({ children, onClick, disabled = false, full = false }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; full?: boolean }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: disabled ? HB_CARD2 : h ? "#00b85e" : HB_GREEN,
        border: "none",
        borderRadius: 8,
        color: disabled ? HB_MUTED2 : "#0C0C0C",
        padding: "10px 22px", fontSize: 14, fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        width: full ? "100%" : undefined,
        letterSpacing: "-0.01em",
        transition: "background 0.15s",
        boxShadow: disabled ? "none" : `0 2px 10px ${HB_GREEN}30`,
      }}
    >
      {children}
    </button>
  );
}

function GBtn({ children, onClick, disabled = false }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "none",
        border: `1px solid ${HB_BORDER}`,
        borderRadius: 8,
        color: disabled ? HB_MUTED2 : HB_MUTED,
        padding: "9px 20px", fontSize: 13, fontWeight: 500,
        cursor: disabled ? "default" : "pointer",
        transition: "border-color 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function ProgBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 2, background: HB_BORDER, borderRadius: 1, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: HB_GREEN, borderRadius: 1, transition: "width 0.5s ease" }} />
    </div>
  );
}

function Dot({ state }: { state: "done" | "active" | "idle" }) {
  return (
    <div style={{
      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
      background: state === "idle" ? HB_MUTED2 : HB_GREEN,
      transition: "background 0.3s",
    }} />
  );
}

function InfoBox({ children, color = HB_GREEN }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{
      background: color + "0C",
      border: `1px solid ${color}22`,
      borderRadius: 8,
      padding: "10px 14px",
      fontSize: 12,
      color: HB_MUTED,
      lineHeight: 1.65,
    }}>
      {children}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: HB_CARD2, borderRadius: 8, padding: "10px 13px", border: `1px solid ${HB_BORDER}` }}>
      <div style={{ fontSize: 11, color: HB_MUTED, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: HB_TEXT }}>{value}</div>
    </div>
  );
}

// ---- Deposit Address Tab ----
function DepositDemo() {
  const [step, setStep] = useState<DepositStep>("idle");
  const [chainId, setChainId] = useState("42161");
  const [amount, setAmount] = useState("100");
  const [recipient, setRecipient] = useState("");
  const [depositAddr, setDepositAddr] = useState("");
  const [outputAmt, setOutputAmt] = useState("");
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [fillAmt, setFillAmt] = useState("");
  const pollRef = useState<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    setStep("idle"); setDepositAddr(""); setOutputAmt(""); setCopied(false);
    setErrorMsg(""); setFillAmt("");
    if (pollRef[0]) { clearInterval(pollRef[0]); (pollRef as unknown as { 0: null })[0] = null; }
  }, [pollRef]);

  const generate = useCallback(async () => {
    if (!recipient || recipient.trim().length < 10) {
      setErrorMsg("Enter a valid Hyperliquid address.");
      return;
    }
    setStep("loading"); setErrorMsg("");
    const amountInUnits = Math.floor(parseFloat(amount) * 1_000_000).toString();
    try {
      const params = new URLSearchParams({
        inputToken: USDC_BY_CHAIN[chainId],
        originChainId: chainId,
        outputToken: USDH_ADDRESS,
        destinationChainId: HL_CHAIN_ID,
        recipient: recipient.trim(),
        refundAddress: recipient.trim(),
        amount: amountInUnits,
      });
      const res = await fetch(`/api/deposit-address?${params}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error ?? data));
      const addr = data.depositAddress ?? data.deposit_address;
      if (!addr) throw new Error("No deposit address in response");
      setDepositAddr(addr); setOutputAmt(amount); setStep("waiting");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }, [recipient, amount, chainId]);

  const startPolling = useCallback(async () => {
    setStep("polling");
    let baseline = 0;
    try {
      const res = await fetch("https://api.hyperliquid.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "spotClearinghouseState", user: recipient.trim() }),
      });
      const data = await res.json();
      const usdh = data.balances?.find((b: { coin: string; total: string }) => b.coin === "USDH");
      baseline = usdh ? parseFloat(usdh.total) : 0;
    } catch { /* start from 0 */ }

    const interval = setInterval(async () => {
      try {
        const res = await fetch("https://api.hyperliquid.xyz/info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "spotClearinghouseState", user: recipient.trim() }),
        });
        const data = await res.json();
        const usdh = data.balances?.find((b: { coin: string; total: string }) => b.coin === "USDH");
        const current = usdh ? parseFloat(usdh.total) : 0;
        if (current > baseline) {
          clearInterval(interval); (pollRef as unknown as { 0: null })[0] = null;
          setFillAmt((current - baseline).toFixed(4)); setStep("filled");
        }
      } catch { /* keep polling */ }
    }, 500);
    (pollRef as unknown as { 0: ReturnType<typeof setInterval> })[0] = interval;
  }, [recipient, pollRef]);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(depositAddr).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }, [depositAddr]);

  const pct = ({ idle: 0, loading: 0, waiting: 40, polling: 75, filled: 100, error: 0 } as Record<string, number>)[step] ?? 0;
  const selectedChain = SOURCE_CHAINS.find(c => c.id === chainId)!;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <InfoBox>
        <strong style={{ color: HB_TEXT }}>Omnichain deposit address.</strong>{" "}
        Across generates a unique address that accepts USDC from any chain and routes it to your Hyperliquid account as USDH.
        No wallet connection required. Hyperbeat absorbs the bridge cost so users receive 1:1 with zero fees.
      </InfoBox>

      {/* Flow header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: HB_CARD2, border: `1px solid ${HB_BORDER}`, borderRadius: 10, padding: "12px 16px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: HB_MUTED, marginBottom: 3 }}>FROM</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: HB_TEXT }}>USDC</div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ height: 2, background: `linear-gradient(to right, ${HB_GREEN}, ${A_ORANGE})`, borderRadius: 1, position: "relative" }}>
            <div style={{
              position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
              background: HB_CARD, border: `1px solid ${HB_BORDER}`, borderRadius: 20,
              padding: "2px 8px", fontSize: 11, fontWeight: 600, color: HB_GREEN, whiteSpace: "nowrap",
            }}>
              1:1 zero fee
            </div>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: HB_MUTED, marginBottom: 3 }}>TO</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: HB_TEXT }}>USDH on Hyperliquid</div>
        </div>
      </div>

      {/* Inputs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <FL>Source chain</FL>
          <select
            value={chainId}
            onChange={e => { setChainId(e.target.value); reset(); }}
            style={{
              width: "100%", background: HB_CARD2, border: `1px solid ${HB_BORDER}`,
              borderRadius: 8, color: HB_TEXT, fontSize: 13,
              padding: "9px 28px 9px 12px", outline: "none", cursor: "pointer",
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888888' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
            }}
          >
            {SOURCE_CHAINS.map(c => <option key={c.id} value={c.id} style={{ background: HB_CARD }}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <FL>Amount (USDC)</FL>
          <DInput value={amount} onChange={v => { setAmount(v); reset(); }} placeholder="100" />
        </div>
      </div>

      <div>
        <FL>Hyperliquid recipient address</FL>
        <DInput value={recipient} onChange={v => { setRecipient(v); reset(); }} mono placeholder="0x... your Hyperliquid wallet address" />
      </div>

      {step === "idle" && <PBtn onClick={generate} full>Generate deposit address</PBtn>}

      {step === "loading" && (
        <div style={{ textAlign: "center", color: HB_MUTED, fontSize: 13, padding: "12px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{ width: 14, height: 14, border: `2px solid ${HB_BORDER}`, borderTop: `2px solid ${HB_GREEN}`, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          Generating address via Across...
        </div>
      )}

      {step === "error" && (
        <div style={{ background: "#1a0a0a", border: "1px solid #3a1010", borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#ff6b6b", marginBottom: 4 }}>Could not generate address</div>
          <div style={{ fontSize: 12, color: "#cc4444", lineHeight: 1.6 }}>{errorMsg}</div>
          <button onClick={reset} style={{ marginTop: 8, background: "none", border: "1px solid #3a1010", borderRadius: 5, color: "#ff6b6b", padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      )}

      {(["waiting", "polling", "filled"] as DepositStep[]).includes(step) && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <StatBox label="You send" value={`${amount} USDC`} />
            <StatBox label="Bridge fee" value="$0.00" />
            <StatBox label="Recipient receives" value={`${outputAmt} USDH`} />
          </div>

          <div style={{ background: HB_CARD2, border: `1px solid ${HB_BORDER}`, borderRadius: 8, padding: "13px 15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: HB_MUTED, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Deposit address ({selectedChain.label})
              </span>
              <button
                onClick={copy}
                style={{
                  background: copied ? HB_GREEN : "none",
                  border: `1px solid ${copied ? HB_GREEN : HB_BORDER}`,
                  color: copied ? "#0C0C0C" : HB_MUTED,
                  borderRadius: 5, padding: "2px 10px", fontSize: 11,
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: HB_TEXT, wordBreak: "break-all", lineHeight: 1.5 }}>
              {depositAddr}
            </div>
            <div style={{ fontSize: 12, color: HB_MUTED, marginTop: 8 }}>
              Send USDC here from any wallet or exchange on {selectedChain.label}. Across detects the deposit and delivers USDH to your Hyperliquid address in approximately 2 seconds.
            </div>
          </div>

          <ProgBar pct={pct} />

          {step === "waiting" && (
            <PBtn onClick={startPolling} full>I&apos;ve sent USDC, track my USDH balance</PBtn>
          )}

          {step === "polling" && (
            <div style={{ background: HB_GREEN + "0A", border: `1px solid ${HB_GREEN}22`, borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: HB_GREEN, animation: "pulse 1.5s infinite", flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: HB_TEXT }}>
                Watching USDH balance for{" "}
                <span style={{ fontFamily: "monospace", fontSize: 11, color: HB_MUTED }}>{shortAddr(recipient)}</span>
                <span style={{ color: HB_MUTED }}> checking every 500ms</span>
              </div>
            </div>
          )}

          {step === "filled" && (
            <>
              <div style={{ background: HB_GREEN + "0F", border: `1px solid ${HB_GREEN}30`, borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: HB_GREEN, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: HB_GREEN }}>Settlement complete</div>
                  <div style={{ fontSize: 12, color: HB_MUTED, marginTop: 2 }}>
                    +{formatAmt(fillAmt)} USDH arrived at{" "}
                    <span style={{ fontFamily: "monospace" }}>{shortAddr(recipient)}</span> on Hyperliquid. 1:1, $0 fee.
                  </div>
                </div>
              </div>
              <a
                href={`https://hyperevmscan.io/address/${recipient.trim()}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 12, color: HB_GREEN, fontWeight: 600, textDecoration: "none",
                  background: HB_GREEN + "0A", border: `1px solid ${HB_GREEN}25`,
                  borderRadius: 7, padding: "7px 14px",
                }}
              >
                View on HyperEVMScan
              </a>
              <GBtn onClick={reset}>Reset demo</GBtn>
            </>
          )}
        </>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: HB_MUTED }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: A_ORANGE, animation: "pulse 1.5s infinite" }} />
        Powered by <AcrossLogo size={15} />
        <span style={{ color: HB_TEXT, fontWeight: 600 }}>Across Protocol</span>
      </div>
    </div>
  );
}

// ---- Wallet-Connected Tab ----
function WalletDemo() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();

  const [chainId, setChainId] = useState("42161");
  const [amount, setAmt] = useState("100");
  const [recipient, setRecip] = useState("");
  const [step, setStep] = useState<WalletStep>("idle");
  const [quote, setQuote] = useState<{ fee: string; out: string; calldata: string; to: string; value: string } | null>(null);
  const [txHash, setTxHash] = useState("");
  const [fillAmt, setFillAmt] = useState("");
  const [baseline, setBaseline] = useState(0);
  const [errorMsg, setErrMsg] = useState("");
  const pollRef = useState<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    setStep("idle"); setQuote(null); setTxHash(""); setFillAmt(""); setErrMsg("");
    if (pollRef[0]) { clearInterval(pollRef[0]); (pollRef as unknown as { 0: null })[0] = null; }
  }, [pollRef]);

  const connectAndQuote = useCallback(async () => {
    if (!isConnected) { openConnectModal?.(); return; }
    if (!recipient || recipient.trim().length < 10) { setErrMsg("Enter a valid Hyperliquid recipient address."); return; }
    setStep("quoting"); setErrMsg("");
    try {
      const amountInUnits = Math.floor(parseFloat(amount) * 1_000_000).toString();
      const params = new URLSearchParams({
        inputToken: USDC_BY_CHAIN[chainId],
        originChainId: chainId,
        outputToken: USDH_ADDRESS,
        destinationChainId: HL_CHAIN_ID,
        recipient: recipient.trim(),
        amount: amountInUnits,
        integratorId: "0x00ce",
      });
      const res = await fetch(`https://app.across.to/api/swap/approval?${params}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? JSON.stringify(data));
      setQuote({
        fee: "0.00", out: amount,
        calldata: data.calldata ?? data.swapTx?.data ?? "",
        to: data.to ?? data.swapTx?.to ?? "",
        value: data.value ?? data.swapTx?.value ?? "0",
      });
      try {
        const br = await fetch("https://api.hyperliquid.xyz/info", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "spotClearinghouseState", user: recipient.trim() }),
        });
        const bd = await br.json();
        const usdh = bd.balances?.find((b: { coin: string; total: string }) => b.coin === "USDH");
        setBaseline(usdh ? parseFloat(usdh.total) : 0);
      } catch { setBaseline(0); }
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : String(err));
      setStep("idle");
    }
  }, [isConnected, openConnectModal, address, recipient, amount, chainId]);

  const sign = useCallback(async () => {
    if (!quote) return;
    setStep("signing");
    try {
      await switchChainAsync({ chainId: parseInt(chainId) });
      setStep("bridging");
      const hash = await sendTransactionAsync({
        to: quote.to as `0x${string}`,
        data: quote.calldata as `0x${string}`,
        value: BigInt(quote.value || "0"),
        chainId: parseInt(chainId),
      });
      setTxHash(hash);
      const interval = setInterval(async () => {
        try {
          const res = await fetch("https://api.hyperliquid.xyz/info", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "spotClearinghouseState", user: recipient.trim() }),
          });
          const data = await res.json();
          const usdh = data.balances?.find((b: { coin: string; total: string }) => b.coin === "USDH");
          const current = usdh ? parseFloat(usdh.total) : 0;
          if (current > baseline) {
            clearInterval(interval); (pollRef as unknown as { 0: null })[0] = null;
            setFillAmt((current - baseline).toFixed(4)); setStep("done");
          }
        } catch { /* keep polling */ }
      }, 500);
      (pollRef as unknown as { 0: ReturnType<typeof setInterval> })[0] = interval;
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : String(err));
      setStep("quoting");
    }
  }, [quote, chainId, switchChainAsync, sendTransactionAsync, recipient, baseline, pollRef]);

  const pct = ({ idle: 0, quoting: 30, signing: 60, bridging: 80, done: 100 } as Record<string, number>)[step] ?? 0;
  const order: WalletStep[] = ["signing", "bridging", "done"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "#1a1200", border: "1px solid #3a2e0040", borderRadius: 8, padding: "9px 14px" }}>
        <div style={{ fontSize: 12, color: "#b8960a", lineHeight: 1.5 }}>
          <strong style={{ color: "#d4aa10" }}>Not audited.</strong>{" "}
          Real funds, live Across bridge. Smart contract interaction has not been security-audited. Use at your own risk.
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, background: HB_CARD2, border: `1px solid ${HB_BORDER}`, borderRadius: 10, padding: "12px 16px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: HB_MUTED, marginBottom: 3 }}>FROM</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: HB_TEXT }}>USDC</div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ height: 2, background: `linear-gradient(to right, ${HB_GREEN}, ${A_ORANGE})`, borderRadius: 1, position: "relative" }}>
            <div style={{
              position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
              background: HB_CARD, border: `1px solid ${HB_BORDER}`, borderRadius: 20,
              padding: "2px 8px", fontSize: 11, fontWeight: 600, color: HB_GREEN, whiteSpace: "nowrap",
            }}>
              1:1 zero fee
            </div>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: HB_MUTED, marginBottom: 3 }}>TO</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: HB_TEXT }}>USDH on Hyperliquid</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <FL>Source chain</FL>
          <select
            value={chainId}
            onChange={e => { setChainId(e.target.value); reset(); }}
            style={{
              width: "100%", background: HB_CARD2, border: `1px solid ${HB_BORDER}`,
              borderRadius: 8, color: HB_TEXT, fontSize: 13,
              padding: "9px 28px 9px 12px", outline: "none", cursor: "pointer",
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888888' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
            }}
          >
            {SOURCE_CHAINS.map(c => <option key={c.id} value={c.id} style={{ background: HB_CARD }}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <FL>Amount (USDC)</FL>
          <DInput value={amount} onChange={v => { setAmt(v); reset(); }} placeholder="100" />
        </div>
      </div>

      <div>
        <FL>Hyperliquid recipient address</FL>
        <DInput value={recipient} onChange={v => { setRecip(v); reset(); }} mono placeholder="0x... Hyperliquid wallet address" />
      </div>

      {errorMsg && (
        <div style={{ background: "#1a0a0a", border: "1px solid #3a1010", borderRadius: 8, padding: "10px 13px", fontSize: 12, color: "#ff6b6b" }}>
          {errorMsg}
        </div>
      )}

      {isConnected && address && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: HB_GREEN }} />
          <span style={{ color: HB_MUTED }}>Connected:</span>
          <span style={{ fontFamily: "monospace", color: HB_TEXT, fontSize: 11 }}>{shortAddr(address)}</span>
        </div>
      )}

      {step === "idle" && (
        <PBtn onClick={connectAndQuote} full>{isConnected ? "Get quote" : "Connect wallet"}</PBtn>
      )}

      {step === "quoting" && !quote && (
        <div style={{ textAlign: "center", color: HB_MUTED, fontSize: 13, padding: "10px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{ width: 14, height: 14, border: `2px solid ${HB_BORDER}`, borderTop: `2px solid ${HB_GREEN}`, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          Fetching quote from Across...
        </div>
      )}

      {quote && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <StatBox label="You send" value={`${amount} USDC`} />
            <StatBox label="Bridge fee" value="$0.00" />
            <StatBox label="Recipient receives" value={`${amount} USDH`} />
          </div>

          {step === "quoting" && <PBtn onClick={sign} full>Sign and bridge</PBtn>}
          {step !== "quoting" && <ProgBar pct={pct} />}

          {(["signing", "bridging", "done"] as WalletStep[]).includes(step) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {([
                { key: "signing" as WalletStep, label: "Wallet signature confirmed" },
                { key: "bridging" as WalletStep, label: "Relayer filling, delivering USDH to Hyperliquid..." },
                { key: "done" as WalletStep, label: `+${fillAmt} USDH delivered on Hyperliquid` },
              ]).map(({ key, label }) => {
                const ci = order.indexOf(step), mi = order.indexOf(key);
                const isDone = ci > mi || (step === "done" && key === "done");
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                    <Dot state={isDone ? "done" : step === key ? "active" : "idle"} />
                    <span style={{ color: isDone ? HB_TEXT : step === key ? HB_MUTED : HB_MUTED2 }}>{label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {step === "done" && (
            <>
              <div style={{ background: HB_GREEN + "0F", border: `1px solid ${HB_GREEN}30`, borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: HB_GREEN, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: HB_GREEN }}>Settlement complete</div>
                  <div style={{ fontSize: 12, color: HB_MUTED, marginTop: 2 }}>
                    +{formatAmt(fillAmt)} USDH delivered to{" "}
                    {recipient ? shortAddr(recipient) : "recipient"} on Hyperliquid. 1:1, $0 fee.
                  </div>
                </div>
              </div>
              {txHash && (
                <div style={{ fontFamily: "monospace", fontSize: 11, color: HB_MUTED, wordBreak: "break-all", background: HB_CARD2, padding: "8px 10px", borderRadius: 6, border: `1px solid ${HB_BORDER}` }}>
                  tx: {txHash}
                </div>
              )}
              <a
                href={`https://hyperevmscan.io/address/${recipient.trim()}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 12, color: HB_GREEN, fontWeight: 600, textDecoration: "none",
                  background: HB_GREEN + "0A", border: `1px solid ${HB_GREEN}25`,
                  borderRadius: 7, padding: "7px 14px",
                }}
              >
                View on HyperEVMScan
              </a>
              <GBtn onClick={reset}>Reset</GBtn>
            </>
          )}
        </>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: HB_MUTED }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: A_ORANGE, animation: "pulse 1.5s infinite" }} />
        Powered by <AcrossLogo size={15} />
        <span style={{ color: HB_TEXT, fontWeight: 600 }}>Across Protocol</span>
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function Home() {
  const [mode, setMode] = useState<DemoMode>("deposit");

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        body {
          background: ${HB_BG};
          color: ${HB_TEXT};
          font-family: -apple-system, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
        }
        select option { background: ${HB_CARD}; color: ${HB_TEXT}; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: .4 } }
      `}</style>

      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: HB_BG }}>
        {/* Header */}
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 40px", height: 56,
          background: HB_CARD, borderBottom: `1px solid ${HB_BORDER}`,
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <HyperbeatWordmark height={26} />
            <span style={{ color: HB_MUTED2, fontSize: 16, fontWeight: 300, margin: "0 2px" }}>x</span>
            <AcrossLogo size={26} />
            <span style={{ fontFamily: "-apple-system,sans-serif", fontWeight: 700, fontSize: 15, color: A_ORANGE, letterSpacing: "-0.03em" }}>
              Across
            </span>
          </div>
          <div style={{
            fontSize: 10, color: HB_MUTED, letterSpacing: "0.1em", textTransform: "uppercase",
            background: HB_CARD2, border: `1px solid ${HB_BORDER}`,
            padding: "3px 10px", borderRadius: 20,
          }}>
            Internal PoC
          </div>
        </header>

        {/* Main content */}
        <main style={{ flex: 1, padding: "40px 40px 48px", maxWidth: 720, width: "100%", margin: "0 auto" }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                color: HB_GREEN, background: HB_GREEN + "12", border: `1px solid ${HB_GREEN}25`,
                padding: "3px 10px", borderRadius: 20,
              }}>
                Live demo
              </span>
            </div>
            <h1 style={{
              fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800,
              letterSpacing: "-0.04em", color: HB_TEXT,
              margin: "0 0 10px", lineHeight: 1.1,
            }}>
              Fund from any chain.<br />
              <span style={{ color: HB_GREEN }}>Land on Hyperliquid.</span>
            </h1>
            <p style={{ fontSize: 15, color: HB_MUTED, lineHeight: 1.7, maxWidth: 580 }}>
              Across generates a unique deposit address per user. Send USDC from Arbitrum, Ethereum, or Base.
              It arrives as USDH on Hyperliquid in approximately 2 seconds. No wallet connection required. Zero fees to the end user.
            </p>
          </div>

          {/* Tab switcher */}
          <div style={{
            display: "flex", gap: 0, marginBottom: 16,
            background: HB_CARD, border: `1px solid ${HB_BORDER}`,
            borderRadius: 9, padding: 3, width: "fit-content",
          }}>
            {([
              { id: "deposit" as DemoMode, l: "Deposit address (production)" },
              { id: "wallet" as DemoMode, l: "Wallet-connected (not audited)" },
            ]).map(({ id, l }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                style={{
                  background: mode === id ? HB_CARD2 : "transparent",
                  border: mode === id ? `1px solid ${HB_BORDER}` : "none",
                  borderRadius: 7,
                  color: mode === id ? HB_TEXT : HB_MUTED,
                  padding: "7px 16px", fontSize: 13,
                  fontWeight: mode === id ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  boxShadow: mode === id ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Demo card */}
          <div style={{
            background: HB_CARD,
            border: `1px solid ${HB_BORDER}`,
            borderRadius: 14,
            padding: 24,
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}>
            {mode === "deposit" ? <DepositDemo /> : <WalletDemo />}
          </div>

          {/* Footer note */}
          <div style={{ marginTop: 20, fontSize: 12, color: HB_MUTED2, textAlign: "center", lineHeight: 1.6 }}>
            This PoC uses the Across Swap API with integrator ID{" "}
            <span style={{ fontFamily: "monospace", color: HB_MUTED }}>0x00ce</span>.
            Deposit address endpoint:{" "}
            <span style={{ fontFamily: "monospace", color: HB_MUTED }}>/api/swap/counterfactual</span>.
          </div>
        </main>
      </div>
    </>
  );
}
