import * as https from 'https';
import { PodcastPaths } from '../../../shared-models/podcast/podcast-paths.model';
import * as xml2js from 'xml2js'; // Also requires stream and timers packages
import * as functions from 'firebase-functions';
import { publicFirestore } from '../config/db-config';
import { PublicCollectionPaths, SharedCollectionPaths } from '../../../shared-models/routes-and-paths/fb-collection-paths';
import { PodcastContainer } from '../../../shared-models/podcast/podcast-container.model';
import { PodcastEpisode } from '../../../shared-models/podcast/podcast-episode.model';
import { convertHoursMinSecToMill, convertToFriendlyUrlFormat, createOrReverseFirebaseSafeUrl } from '../config/global-helpers';
import { now } from 'moment';
import { Post } from '../../../shared-models/posts/post.model';

const db = publicFirestore;

const fetchBlogPostIdAndHandle = async (episodeUrl: string) => {
  const postsCollectionRef = db.collection(SharedCollectionPaths.POSTS);
  const matchingPostQuerySnapshot = await postsCollectionRef.where('podcastEpisodeUrl', '==', episodeUrl).get()
    .catch(err => {console.log(`Failed to fetch podcast episode from public database:`, err); throw new functions.https.HttpsError('internal', err);});
  
  // Handle situation where no matching post is found
  if (matchingPostQuerySnapshot.empty) {
    console.log('No matching post found for this episodeUrl', episodeUrl);
    return;
  }

  const matchingPost = matchingPostQuerySnapshot.docs[0].data() as Post; // Should only be one matching item
  const postId = matchingPost.id;
  const postHandle = convertToFriendlyUrlFormat(matchingPost.title);

  return {postId, postHandle};
}

// Fetch podcast feed data from Soundcloud
const fetchPodcastFeed = async () => {

  const requestUrl = PodcastPaths.EXPLEARNING_RSS_FEED;

  const requestPromise = new Promise<{podcast: PodcastContainer, episodes: PodcastEpisode[]}>(async (resolve, reject) => {

    const req = https.request(requestUrl, (res) => {
      let fullData = '';
      
      // Build fullData string (this is called multiple times)
      res.on('data', async (d) => {
        const dataBuffer = d as Buffer;
        const stringData = dataBuffer.toString('utf8');
        fullData += stringData;
      });

      // Once the full data has been loaded, parse it
      res.on('end', async () => {
        const parsedXmlPromise = new Promise<{}>((resolv, rejec) => {
          console.log('About to parse full data', fullData);
          xml2js.parseString(fullData, (err, result) => {
            resolv(result);
          });
        });

        const rawJson: any = await parsedXmlPromise;
        console.log('Processing this raw json', rawJson);
        
        // Parse Podcast Container
        const podcastObject = rawJson.rss.channel[0];
        const podcastRssUrl = podcastObject['atom:link'][0].$.href as string;
        const podcastId = podcastRssUrl.split('users:')[1].split('/')[0]; // May change if RSS feed link changes
        const podcastTitle = podcastObject.title[0];
        const podcastDescription = podcastObject.description[0];
        const podcastImageUrl = podcastObject.image[0].url[0];
        const authorWebsite = podcastObject.link[0];

        const podcast: PodcastContainer = {
          id: podcastId,
          rssUrl: podcastRssUrl,
          title: podcastTitle,
          description: podcastDescription,
          imageUrl: podcastImageUrl,
          authorWebsite,
          modifiedDate: now()
        }

        // Parse Podcast Episodes
        const rawEpisodeArray = podcastObject.item as any[];

        const podcastEpisodeArrayPromise = rawEpisodeArray.map(async rawEpisode => {
          
          const episodeUrl = rawEpisode.link[0];
          const episodeId = createOrReverseFirebaseSafeUrl(episodeUrl);
          const episodeGuid = (rawEpisode.guid[0]._ as string).split('tracks/')[1];
          const episodeTitle = rawEpisode.title[0];
          const episodePubDate = Date.parse(rawEpisode.pubDate[0]);
          const episodeDuration = convertHoursMinSecToMill(rawEpisode['itunes:duration'][0]);
          const episodeAuthor = rawEpisode['itunes:author'][0];
          const episodeDescription = rawEpisode.description[0];
          const episodeImageUrl = rawEpisode['itunes:image'][0].$.href;
          let episodeBlogPostId = '';
          let episodeBlogPostUrlHandle = '';
          
          const blogPostData = await fetchBlogPostIdAndHandle(episodeUrl)
            .catch(err => {console.log(`Failed to fetch blog post id and handle:`, err); throw new functions.https.HttpsError('internal', err);});
          
          if (blogPostData) {
            episodeBlogPostId = blogPostData.postId;
            episodeBlogPostUrlHandle = blogPostData.postHandle;
          }

          const podcastEpisode: PodcastEpisode = {
            id: episodeId,
            guid: episodeGuid,
            title: episodeTitle,
            pubDate: episodePubDate,
            episodeUrl,
            duration: episodeDuration,
            author: episodeAuthor,
            description: episodeDescription,
            imageUrl: episodeImageUrl,
            modifiedDate: now(),
            blogPostId: episodeBlogPostId,
            blogPostUrlHandle: episodeBlogPostUrlHandle
          }

          return podcastEpisode;
        })

        const podcastEpisodeArray = await Promise.all(podcastEpisodeArrayPromise);
        

        resolve({podcast, episodes: podcastEpisodeArray});
      })
    });
    
  
    req.on('error', (e) => {
      console.log('Error with request', e);
      reject(e);
    });
    req.end();
  });

  return requestPromise;
}

let itemsProcessedCount = 0; // Keeps track of episodes cached between loops
let loopCount = 0; // Prevents infinite looping in case of error
const batchCacheEpisodes = async (episodes: PodcastEpisode[], podcastDocRef: FirebaseFirestore.DocumentReference) => {
  const episodeCollectionRef = podcastDocRef.collection(PublicCollectionPaths.PODCAST_FEED_EPISODES);
  const remainingEpisodesToCache = episodes.slice(itemsProcessedCount);
  
  const batch = db.batch();
  const maxBatchSize = 450; // Firebase limit is 500
  let batchSize = 0;
  // Loop through array until the max batch size is reached
  for (let i = 0; i < maxBatchSize; i++) {
    // Get the data to upload
    const episode = remainingEpisodesToCache[i];
    if (!episode) {
      break; // Abort loop if end of array reached before batch limit is hit
    }
    // Create a reference to the new doc using the episode id
    const docRef = episodeCollectionRef.doc(episode.id);
    batch.set(docRef, episode);
    batchSize = i+1;
  }

  const batchCreate = await batch.commit()
    .catch(err => {console.log(`Error with batch creation:`, err); throw new functions.https.HttpsError('internal', err);});

  console.log(`Batch created ${batchCreate.length} items`);
  itemsProcessedCount += batchSize; // Update global variable to keep track of remaining episodes to cache
  loopCount++;
}

// Cache the podcast along with the episodes as a subcollection of the podcast
const cachePodcastFeed = async (podcast: PodcastContainer, episodes: PodcastEpisode[]) => {

  itemsProcessedCount = 0; // Initialize at zero (prevents global variable remenant from last function execution)
  loopCount = 0; // Initialize at zero (prevents global variable remenant from last function execution)

  const podcastDocRef = db.collection(PublicCollectionPaths.PODCAST_FEED_CACHE).doc(podcast.id);

  // Cache the podcast
  await podcastDocRef.set(podcast)
    .catch(err => {console.log(`Error setting podcast in public database:`, err); throw new functions.https.HttpsError('internal', err);});
  console.log('Podcast updated');

  // Cache each episode inside the podcast container
  const totalItemCount = episodes.length;
  while (itemsProcessedCount < totalItemCount && loopCount < 10) {
    await batchCacheEpisodes(episodes, podcastDocRef);
    if (itemsProcessedCount < totalItemCount) {
      console.log(`Repeating batch process: ${itemsProcessedCount} out of ${totalItemCount} items cached`);
    }
  }
}



const executeActions = async (): Promise<PodcastContainer> => {
  const {podcast, episodes}: {podcast: PodcastContainer, episodes: PodcastEpisode[]} = await fetchPodcastFeed();
  console.log(`Fetched podcast feed with ${episodes.length} episodes`);

  await cachePodcastFeed(podcast, episodes);
  console.log('Podcast caching complete');
  
  return podcast;
}

/////// DEPLOYABLE FUNCTIONS ///////

// This fires every day based on chron job
export const updatePodcastFeedCache = functions.https.onRequest( async (req, resp) => {
  console.log('Get podcast feed request detected with these headers', req.headers);

  // Verify request is from chron job
  if (req.headers['user-agent'] !== 'Google-Cloud-Scheduler') {
    console.log('Invalid request, ending operation');
    return;
  }

  const podcast: PodcastContainer = await executeActions();

  
  return resp.status(200).send(podcast);
});