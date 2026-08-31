import { SetMetadata } from '@nestjs/common';
import { MetadataConstants } from '../constants/index.js';

export const IS_PUBLIC_KEY = MetadataConstants.IS_PUBLIC;
export const Public = () => SetMetadata(MetadataConstants.IS_PUBLIC, true);
