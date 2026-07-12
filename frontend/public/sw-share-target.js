self.addEventListener('fetch', (event) => {
  if (event.request.method === 'POST' && new URL(event.request.url).pathname === '/share-target') {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const files = formData.getAll('files');
          const title = formData.get('title');
          const text = formData.get('text');
          const url = formData.get('url');
          
          const cache = await caches.open('share-target-cache');
          
          // Clear old cache entries
          const keys = await cache.keys();
          for (const key of keys) {
            await cache.delete(key);
          }
          
          const metadata = {
            title,
            text,
            url,
            files: []
          };
          
          for (const file of files) {
            if (file && file.name) {
              const fileId = Date.now() + '-' + file.name;
              metadata.files.push({
                id: fileId,
                name: file.name,
                type: file.type,
                size: file.size
              });
              await cache.put(
                new Request(`/shared-file/${fileId}`),
                new Response(file, {
                  headers: {
                    'content-type': file.type,
                    'content-length': file.size.toString()
                  }
                })
              );
            }
          }
          
          await cache.put(
            new Request('/shared-metadata.json'),
            new Response(JSON.stringify(metadata), {
              headers: { 'content-type': 'application/json' }
            })
          );
          
          // Redirect to the web app
          return Response.redirect('/?shared=true', 303);
        } catch (error) {
          console.error('Error handling share target:', error);
          return Response.redirect('/?share_error=true', 303);
        }
      })()
    );
  }
});
