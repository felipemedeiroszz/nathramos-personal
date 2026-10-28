export function validCpf(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  for (let length = 9; length <= 10; length++) {
    let sum = 0;
    for (let i = 0; i < length; i++)
      sum += Number(digits[i]) * (length + 1 - i);
    const check = (sum * 10) % 11;
    if ((check === 10 ? 0 : check) !== Number(digits[length])) return false;
  }
  return true;
}
