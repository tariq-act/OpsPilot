export class AuthUserDto {
  id!: string;
  name!: string;
  email!: string;
  emailVerified!: boolean;
  image!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class AuthResponseDto {
  user!: AuthUserDto;
}
