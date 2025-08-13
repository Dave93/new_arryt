import { Elysia, t } from 'elysia';
import { assets, users } from '../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { contextWitUser } from '../../context';

type UserAsset = typeof assets.$inferSelect & {
  link: string;
};

export const userAssetsController = new Elysia({ 
  name: "@app/user-assets"
})
  .use(contextWitUser)
  .post(
    '/api/user-assets/:userId',
    async ({ params, body, set, drizzle }) => {
      try {
        const { userId } = params;
        const { file } = body;

        // Check if user exists
        const user = await drizzle.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user.length) {
          set.status = 404;
          return { error: 'User not found' };
        }

        // Create uploads directory if it doesn't exist using Bun
        const uploadsDir = `${process.cwd()}/../uploads/users/${userId}`;
        const uploadsDirFile = Bun.file(uploadsDir);
        
        // Check if directory exists, if not create it
        if (!(await uploadsDirFile.exists())) {
          // Using Bun's mkdir from node:fs/promises
          const { mkdir } = await import("node:fs/promises");
          await mkdir(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const fileExtIndex = file.name.lastIndexOf('.');
        const fileExt = fileExtIndex > -1 ? file.name.slice(fileExtIndex) : '';
        const fileName = `${crypto.randomUUID()}${fileExt}`;
        const filePath = `${uploadsDir}/${fileName}`;

        // Save file to disk using Bun.write
        await Bun.write(filePath, file);

        // Save asset record to database
        const [asset] = await drizzle.insert(assets).values({
          model: 'users',
          model_id: userId,
          file_name: fileName,
          sub_folder: `users/${userId}`
        }).returning() as UserAsset[];

        asset.link = `${process.env.API_URL}/uploads/${asset.sub_folder}/${asset.file_name}`;

        return { 
          success: true, 
          asset: asset 
        };
      } catch (error) {
        console.error('Error uploading file:', error);
        set.status = 500;
        return { error: 'Failed to upload file' };
      }
    },
    {
      params: t.Object({
        userId: t.String()
      }),
      body: t.Object({
        file: t.File()
      })
    }
  )
  .get(
    '/api/user-assets/:userId',
    async ({ params, set, drizzle }) => {
      try {
        const { userId } = params;

        // Check if user exists
        const user = await drizzle.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user.length) {
          set.status = 404;
          return { error: 'User not found' };
        }

        // Get all assets for the user
        const userAssets = await drizzle
          .select()
          .from(assets)
          .where(
            and(
              eq(assets.model, 'users'),
              eq(assets.model_id, userId)
            )
          ) as UserAsset[];

        userAssets.forEach(asset => {
          asset.link = `${process.env.API_URL}/uploads/${asset.sub_folder}/${asset.file_name}`;
        });

        return { 
          success: true, 
          assets: userAssets 
        };
      } catch (error) {
        console.error('Error fetching user assets:', error);
        set.status = 500;
        return { error: 'Failed to fetch assets' };
      }
    },
    {
      params: t.Object({
        userId: t.String()
      })
    }
  )
  .delete(
    '/api/user-assets/:userId/:assetId',
    async ({ params, set, drizzle }) => {
      try {
        const { userId, assetId } = params;

        // Get asset record
        const [asset] = await drizzle
          .select()
          .from(assets)
          .where(
            and(
              eq(assets.id, assetId),
              eq(assets.model, 'users')
            )
          )
          .limit(1);

        if (!asset) {
          set.status = 404;
          return { error: 'Asset not found' };
        }

        // Delete file from disk using Bun
        const filePath = `${process.cwd()}/../uploads/${asset.sub_folder}/${asset.file_name}`;
        const file = Bun.file(filePath);
        
        // Check if file exists and delete it
        if (await file.exists()) {
          // Using Bun's unlink from node:fs/promises
          const { unlink } = await import("node:fs/promises");
          await unlink(filePath);
        }

        // Delete asset record from database
        await drizzle.delete(assets).where(eq(assets.id, assetId));

        return { 
          success: true, 
          message: 'Asset deleted successfully' 
        };
      } catch (error) {
        console.error('Error deleting asset:', error);
        set.status = 500;
        return { error: 'Failed to delete asset' };
      }
    },
    {
      params: t.Object({
        userId: t.String(),
        assetId: t.String()
      })
    }
  );