import { z } from "zod";

export const instrumentSymbolSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z][A-Z0-9.-]{0,9}$/);

const timestamp = z.iso.datetime({ offset: true });

export const candleSchema = z.object({
  timestamp,
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
});

export const instrumentSessionSchema = z.object({
  sessionDate: z.iso.date().nullable(),
  candles: z.array(candleSchema),
});

export const instrumentQuoteSchema = z.object({
  price: z.number().nullable(),
  changePercent: z.number().nullable(),
  previousClose: z.number().nullable(),
  asOf: timestamp.nullable(),
  bid: z.number().nullable(),
  ask: z.number().nullable(),
  quoteAsOf: timestamp.nullable(),
  dailyBar: candleSchema
    .extend({
      vwap: z.number().nullable(),
      trades: z.number().nullable(),
    })
    .nullable(),
  marketOpen: z.boolean(),
  nextOpen: timestamp,
});

export const instrumentDetailSchema = instrumentQuoteSchema.extend({
  name: z.string(),
  exchange: z.string().nullable(),
  currency: z.string(),
});

export type InstrumentQuote = z.infer<typeof instrumentQuoteSchema>;
export type InstrumentSession = z.infer<typeof instrumentSessionSchema>;
