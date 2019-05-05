import * as functions from 'firebase-functions';
import { getStripeCustomerId, getOrCreateCustomer } from "./customers";
import { stripe } from './config';
import { attachSource } from './sources';
import { assertUID, assert, catchErrors } from './helpers';
import { StripeChargeData } from '../../../shared-models/billing/stripe-charge-data.model';

/**
 * Gets a user's charge history
 */
export const getUserCharges = async(uid: string, limit?: number) => {
  const customer = await getStripeCustomerId(uid);

  return await stripe.charges.list({
    limit,
    customer
  });
}

/**
 * Creates a charge for a specific amount
 * 
 * @amount in pennies (e.g. $20 === 2000)
 * @idempotency_key ensures charge will only be executed once
 */
export const createCharge = async(uid: string, source: stripe.Source, amount: number, idempotency_key?: string) => {
  
  const customer = await getOrCreateCustomer(uid);

  await attachSource(uid, source);

  return stripe.charges.create({
    amount,
    customer: customer.id,
    source: source.id,
    currency: 'usd',
  },
  { idempotency_key }
  )
}


/////// DEPLOYABLE FUNCTIONS ///////

export const stripeCreateCharge = functions.https.onCall( async (data: StripeChargeData, context) => {
  console.log('Create charge request received with this data', data);
  const uid: string = assertUID(context);
  const source: stripe.Source = assert(data, 'source');
  const amount: number = assert(data, 'priceInCents');

  // // Optional -- Prevents multiple charges
  // const idempotency_key = data.itempotency_key;

  return catchErrors( createCharge(uid, source, amount) );
})

export const stripeGetCharges = functions.https.onCall( async (data, context) => {
  const uid = assertUID(context);
  return catchErrors( getUserCharges(uid) );
});