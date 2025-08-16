from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view
from .models import User, Post
from .serializers import UserSerializer, PostSerializer, CreatePostSerializer


@extend_schema_view(
    list=extend_schema(description="List all users"),
    create=extend_schema(description="Create a new user"),
    retrieve=extend_schema(description="Get a specific user"),
    update=extend_schema(description="Update a user"),
    partial_update=extend_schema(description="Partially update a user"),
    destroy=extend_schema(description="Delete a user"),
)
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    @extend_schema(
        description="Get posts for a specific user",
        responses={200: PostSerializer(many=True)}
    )
    @action(detail=True, methods=['get'])
    def posts(self, request, pk=None):
        user = self.get_object()
        posts = Post.objects.filter(author=user)
        serializer = PostSerializer(posts, many=True)
        return Response(serializer.data)


@extend_schema_view(
    list=extend_schema(description="List all posts"),
    create=extend_schema(description="Create a new post"),
    retrieve=extend_schema(description="Get a specific post"),
    update=extend_schema(description="Update a post"),
    partial_update=extend_schema(description="Partially update a post"),
    destroy=extend_schema(description="Delete a post"),
)
class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreatePostSerializer
        return PostSerializer
