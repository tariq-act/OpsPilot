/**
 * Domain query helpers (read/write by feature).
 */
export {
  createOrganizationWithOwner,
  listOrganizationsForUser,
} from './organizations.js';
export type {
  CreateOrganizationInput,
  CreateOwnerMembershipInput,
  OrganizationWithMembership,
} from './organizations.js';
