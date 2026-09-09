from rest_framework.pagination import PageNumberPagination


class CataloguePagination(PageNumberPagination):
    page_size = 12
