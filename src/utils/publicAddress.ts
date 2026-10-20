// Shared by URL validation and the server's DNS checks. Only globally routable
// addresses may be used for source links or outgoing requests.
export function isPublicIp(address: string): boolean {
  const value = address.replace(/^\[|\]$/g, '').toLowerCase();
  if (value.includes(':')) {
    if(!/^[0-9a-f:]+$/.test(value)) return false;
    const [first,second='0'] = value.split(':');
    const prefix = parseInt(first,16), subnet = parseInt(second || '0',16);
    return prefix >= 0x2000 && prefix < 0x3fff && prefix !== 0x2002 && !(prefix === 0x2001 && (subnet === 0xdb8 || subnet === 0 || (subnet >= 0x10 && subnet <= 0x2f)));
  }
  if(!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) return false;
  const bytes = value.split('.').map(Number);
  if (bytes.length !== 4 || bytes.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b, c] = bytes;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0)) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113));
}

export function isPublicHost(hostname: string): boolean {
  const host = hostname.replace(/\.$/, '').toLowerCase();
  if (host.includes(':') || /^[0-9.]+$/.test(host)) return isPublicIp(host);
  return host.includes('.') && !/(^|\.)(localhost|local|internal|lan|home|invalid|test)$/.test(host);
}
