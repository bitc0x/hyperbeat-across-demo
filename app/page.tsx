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

// Across logo (base64)
const ACROSS_LOGO_B64 = "data:image/png;base64,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";

function AcrossLogo({ size = 20 }: { size?: number }) {
  return (
    <img
      src={ACROSS_LOGO_B64}
      alt="Across"
      width={size}
      height={size}
      style={{ verticalAlign: "middle", display: "inline-block", flexShrink: 0 }}
    />
  );
}

function HyperbeatWordmark({ height = 28 }: { height?: number }) {
  return (
    <img
      src="/hyperbeat-logo.svg"
      alt="Hyperbeat"
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
