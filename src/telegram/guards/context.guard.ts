import { Context } from 'telegraf';
import { Message, User } from 'telegraf/types'; // ИЗМЕНЕНО: используем telegraf/types

export function hasFrom(ctx: Context): ctx is Context & { from: User } {
  return ctx.from !== undefined;
}

export function hasMessage(ctx: Context): ctx is Context & { message: Message } {
  return ctx.message !== undefined;
}

export function hasTextMessage(ctx: Context): ctx is Context & { 
  message: Message.TextMessage;
  from: User;
} {
  return (
    ctx.message !== undefined &&
    'text' in ctx.message &&
    ctx.from !== undefined
  );
}