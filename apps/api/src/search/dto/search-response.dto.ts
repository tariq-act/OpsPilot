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
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() description: string;
  @ApiProperty() status: string;
}

export class SearchGroupDto {
  @ApiProperty({ enum: SEARCH_ENTITY_TYPES }) type: SearchEntityType;
  @ApiProperty({ type: [SearchResultDto] }) results: SearchResultDto[];
  @ApiProperty({
    description: 'More matches exist. Refine the query to narrow results.',
  })
  hasMore: boolean;
}

export class SearchResponseDto {
  @ApiProperty() query: string;
  @ApiProperty({ example: 5 }) limitPerGroup: number;
  @ApiProperty({ type: [SearchGroupDto] }) groups: SearchGroupDto[];
}
