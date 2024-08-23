/**
 * Virtual XYK curve. All SOL amounts are in lamports.
 */
export type Curve = {
  token_amount: bigint;
  distributed_token_amount: bigint;
  virtual_sol_amount: bigint;
  actual_sol_amount: bigint;
}

export const token_out = (
  curve: Curve,
  sol_in: bigint,
  fee_percent?: number,
): bigint => {
  const sol_in_after_fee = fee_percent
    ? BigInt(Math.floor(Number(sol_in) * (1 - fee_percent)))
    : sol_in;

  const k = (curve.virtual_sol_amount + curve.actual_sol_amount) * curve.token_amount;
  const denominator = curve.virtual_sol_amount + curve.actual_sol_amount + sol_in_after_fee;
  return curve.token_amount - (k / denominator)
}

export const sol_out = (
  curve: Curve,
  token_in: bigint,
  fee_percent?: number,
): bigint => {
  const numerator = curve.token_amount * (curve.virtual_sol_amount + curve.actual_sol_amount);
  const denominator = curve.token_amount + token_in;
  const sol_out = curve.virtual_sol_amount + curve.actual_sol_amount - (numerator / denominator);

  return fee_percent
    ? BigInt(Math.floor(Number(sol_out) * (1 - fee_percent)))
    : sol_out;
}

export type ExecuteMsg =
  | { type: "buy", amount: bigint }
  | { type: "sell", amount: bigint }

export type ContractState = {
  curve: Curve;
}

export const execute_state_transition = (
  state: ContractState,
  msg: ExecuteMsg,
): ContractState => {
  if (msg.type === "buy") {
    const { curve } = state;
    const token_amount_out = token_out(curve, msg.amount);
    const new_curve = {
      ...curve,
      actual_sol_amount: curve.actual_sol_amount + BigInt(msg.amount),
      token_amount: curve.token_amount - token_amount_out,
      distributed_token_amount: curve.distributed_token_amount + token_amount_out,
    }
    const new_state = { curve: new_curve, };

    return new_state;
  } else if (msg.type === "sell") {
    const { curve } = state;
    const sol_amount_out = sol_out(curve, msg.amount);
    const new_curve = {
      ...curve,
      actual_sol_amount: curve.actual_sol_amount - sol_amount_out,
      token_amount: curve.token_amount + msg.amount,
      distributed_token_amount: curve.distributed_token_amount - msg.amount,
    };

    return { curve: new_curve };
  }

  throw new Error("Invalid message type");
}
