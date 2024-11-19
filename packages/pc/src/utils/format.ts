export const formatNumber = (num: number | string | bigint) => {
    if (typeof num === 'bigint') {
      return Number(num).toLocaleString();
    }

    const n = typeof num === 'string' ? parseInt(num) : num;
    return n.toLocaleString();
  };