import { z } from 'zod';

// FR-EXP-02: users may hide their expert fingerprint from everyone else.
export const fingerprintVisibilitySchema = z.object({
  public: z.boolean(),
});

export type FingerprintVisibilityInput = z.infer<typeof fingerprintVisibilitySchema>;
