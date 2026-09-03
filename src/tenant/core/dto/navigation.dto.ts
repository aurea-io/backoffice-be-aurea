export interface NavigationModuleDto {
  key: string;
  name: string;
  description?: string;
}

export interface NavigationPageDto {
  id: string;
  name: string;
  path: string;
  feature?: string;
  modules: NavigationModuleDto[];
}

export interface NavigationSectionDto {
  id: string;
  name: string;
  description?: string;
  pages: NavigationPageDto[];
}

export interface NavigationResponseDto {
  sections: NavigationSectionDto[];
}
