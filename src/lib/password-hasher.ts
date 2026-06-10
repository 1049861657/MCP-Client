import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

// OWASP Argon2id 基线参数（Password Storage Cheat Sheet）：m=19456 KiB、t=2、p=1。
const MEMORY_KIB = 19456;
const PASSES = 2;
const PARALLELISM = 1;
const TAG_LENGTH = 32;
const SALT_LENGTH = 16;
const ARGON2_VERSION = 19;

interface Argon2Parameters {
  message: Buffer;
  nonce: Buffer;
  parallelism: number;
  tagLength: number;
  memory: number;
  passes: number;
}

// crypto.argon2(algorithm, parameters, callback)：异步避免阻塞事件循环。
const argon2Async = promisify(argon2) as (
  algorithm: 'argon2id',
  parameters: Argon2Parameters,
) => Promise<Buffer>;

function toB64(buf: Buffer): string {
  return buf.toString('base64').replace(/=+$/, '');
}

function fromB64(value: string): Buffer {
  return Buffer.from(value, 'base64');
}

async function deriveTag(
  password: string,
  salt: Buffer,
  memory: number,
  passes: number,
  parallelism: number,
): Promise<Buffer> {
  return argon2Async('argon2id', {
    message: Buffer.from(password, 'utf8'),
    nonce: salt,
    parallelism,
    tagLength: TAG_LENGTH,
    memory,
    passes,
  });
}

/** 生成 PHC 格式的 argon2id 哈希串：$argon2id$v=19$m=...,t=...,p=...$salt$hash */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const tag = await deriveTag(password, salt, MEMORY_KIB, PASSES, PARALLELISM);
  return `$argon2id$v=${ARGON2_VERSION}$m=${MEMORY_KIB},t=${PASSES},p=${PARALLELISM}$${toB64(salt)}$${toB64(tag)}`;
}

/** 解析 PHC 串取参数重算，timingSafeEqual 比较；格式非法即 throw（fail-fast，不静默放行） */
export async function verifyPassword(input: {
  hash: string;
  password: string;
}): Promise<boolean> {
  const match = /^\$argon2id\$v=(\d+)\$m=(\d+),t=(\d+),p=(\d+)\$([^$]+)\$([^$]+)$/.exec(
    input.hash,
  );
  if (!match) {
    throw new Error('密码哈希格式非法，无法校验');
  }
  const memory = Number(match[2]);
  const passes = Number(match[3]);
  const parallelism = Number(match[4]);
  const salt = fromB64(match[5]);
  const expected = fromB64(match[6]);
  const actual = await deriveTag(input.password, salt, memory, passes, parallelism);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
