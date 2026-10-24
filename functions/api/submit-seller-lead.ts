import {
  handleSellerApiRequest,
  type SellerApiEnv,
} from '../../src/server/sellerLeadApi.ts';

export const onRequest = async (context: {
  request: Request;
  env: SellerApiEnv;
}): Promise<Response> => {
  return handleSellerApiRequest(context.request, context.env);
};
