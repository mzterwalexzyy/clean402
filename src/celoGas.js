// Celo fee abstraction: when a transaction pays gas in an ERC-20, the block base fee is
// denominated in THAT currency, not CELO. viem's default estimation uses the native price,
// which the node rejects ("fee cap cannot be lower than the block base fee") or which makes
// the upfront debit wrong. Celo's RPC exposes the correct values via an extra feeCurrency
// parameter on eth_gasPrice and eth_maxPriorityFeePerGas, so ask for those instead.
const GAS_LIMIT = 120_000n; // an ERC-20 transfer with a data suffix, with headroom

export async function feeCurrencyGas(publicClient, feeCurrency) {
  const [priceRaw, tipRaw] = await Promise.all([
    publicClient.request({ method: "eth_gasPrice", params: [feeCurrency] }),
    publicClient.request({ method: "eth_maxPriorityFeePerGas", params: [feeCurrency] }),
  ]);
  const price = BigInt(priceRaw);
  const tip = BigInt(tipRaw);
  return {
    gas: GAS_LIMIT,
    // double the observed price so a base-fee bump between estimate and inclusion
    // does not reject the transaction
    maxFeePerGas: price * 2n + tip,
    maxPriorityFeePerGas: tip,
    feeCurrency,
  };
}
