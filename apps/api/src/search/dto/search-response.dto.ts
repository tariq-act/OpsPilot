import { ApiProperty } from '@nestjs/swagger';

export const SEARCH_ENTITY_TYPES = [
  'customers',
  'serviceRequests',
  'jobs',
  'technicians',
  'invoices',
] as const;
export type SearchEntityType = (typeof SEARCH_ENTITY_TYPES)[number];

export class SearchResultDto {
  // Swagger docs START
  @ApiProperty()
  // Swagger docs END
  id: string;
  // Swagger docs START
  @ApiProperty()
  // Swagger docs END
  title: string;
  // Swagger docs START
  @ApiProperty()
  // Swagger docs END
  description: string;
  // Swagger docs START
  @ApiProperty()
  // Swagger docs END
  status: string;
}

export class SearchGroupDto {
  // Swagger docs START
  @ApiProperty({ enum: SEARCH_ENTITY_TYPES })
  // Swagger docs END
  type: SearchEntityType;
  // Swagger docs START
  @ApiProperty({ type: [SearchResultDto] })
  // Swagger docs END
  results: SearchResultDto[];
  // Swagger docs START
  @ApiProperty({
    description: 'More matches exist. Refine the query to narrow results.',
  })
  // Swagger docs END
  hasMore: boolean;
}

export class SearchResponseDto {
  // Swagger docs START
  @ApiProperty()
  // Swagger docs END
  query: string;
  // Swagger docs START
  @ApiProperty({ example: 5 })
  // Swagger docs END
  limitPerGroup: number;
  // Swagger docs START
  @ApiProperty({ type: [SearchGroupDto] })
  // Swagger docs END
  groups: SearchGroupDto[];
}
