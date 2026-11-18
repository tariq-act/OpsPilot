import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { findActiveMembership } from '../db/queries/members.js';
import { searchOrganization } from '../db/queries/search.js';
import type { SearchResponseDto } from './dto/search-response.dto.js';

@Injectable()
export class SearchService {
  async search(
    actorUserId: string,
    organizationId: string,
    query: string,
  ): Promise<SearchResponseDto> {
    const membership = await findActiveMembership(organizationId, actorUserId);
    if (!membership)
      throw new ForbiddenException('Not a member of this organization');

    const q = query.trim();
    if (q.length < 2 || q.length > 100) {
      throw new BadRequestException(
        'Search must contain between 2 and 100 characters',
      );
    }

    switch (membership.role) {
      case 'OWNER':
      case 'ADMIN':
      case 'DISPATCHER':
        return searchOrganization(organizationId, q, { role: 'manager' });
      case 'TECHNICIAN':
        return searchOrganization(organizationId, q, {
          role: 'technician',
          userId: actorUserId,
        });
      default:
        throw new ForbiddenException('Not allowed to search this organization');
    }
  }
}
