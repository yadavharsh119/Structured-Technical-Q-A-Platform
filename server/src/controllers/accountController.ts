import type { Request, Response } from 'express';
import { deactivateAccountSchema } from '@structured-qa/shared';
import { accountService } from '../services/accountService';
import { asyncHandler, parseBody, requireAuthUserId } from './requestParsing';

// FR-PROF-03: download a ZIP containing only the signed-in user's data.
export const exportMyData = asyncHandler(async (req: Request, res: Response) => {
  const zip = await accountService.exportData(requireAuthUserId(req));
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="account-export-${date}.zip"`);
  res.setHeader('Content-Length', zip.length);
  res.status(200).send(zip);
});

// FR-PROF-02 / SEC-14: verify the password, then anonymise the account.
export const deactivateMyAccount = asyncHandler(async (req: Request, res: Response) => {
  const input = parseBody(deactivateAccountSchema, req.body);
  await accountService.deactivate(requireAuthUserId(req), input);
  res.status(200).json({
    success: true,
    data: { message: 'Account deactivated.' },
  });
});
