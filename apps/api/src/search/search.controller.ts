import { Controller, Get, Header, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { OrganizationId } from '../common/organization-id.decorator.js';
import { ApiErrorDto } from '../swagger/api-error.dto.js';
import { ApiSession } from '../swagger/api-session.decorator.js';
import { SearchQueryDto } from './dto/search-query.dto.js';
import { SearchResponseDto } from './dto/search-response.dto.js';
import { SearchService } from './search.service.js';

// Swagger docs START
@ApiTags('Search')
@ApiSession()
@ApiHeader({
  name: 'x-organization-id',
  required: true,
  description:
    'Active organization. The signed in user must be an active member.',
})
// Swagger docs END
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  // Swagger docs START
  @ApiOperation({
    summary: 'Search accessible organization records',
    description:
      'Returns up to five matches per entity, ordered by title and id. Technicians see only assigned jobs, linked customers, requests and invoices, plus their own profile.',
  })
  @ApiOkResponse({ type: SearchResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  // Swagger docs END
  search(
    @Session() session: UserSession,
    @OrganizationId() organizationId: string,
    @Query() query: SearchQueryDto,
  ): Promise<SearchResponseDto> {
    return this.searchService.search(session.user.id, organizationId, query.q);
  }
}
