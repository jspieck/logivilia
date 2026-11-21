<template>
  <div id="comment-area" class="comment-area">
    <div class="comments-container">
      <h3>{{ $t('comments.title') }}</h3>
      <div v-if="isUserLoggedIn">
        <textarea
          id="mainComment"
          class="comment-input"
          :placeholder="$t('comments.placeholder')"
          v-model="userComment"
        ></textarea>
        <div class="divsend">
          <button class="button is-primary" @click="sendComment">
            <span>{{ $t('comments.send') }}</span>
            <ion-icon name="paper-plane-sharp"></ion-icon>
          </button>
          <div v-if="commentSend" class="dankeBox replyInactive">{{ $t('comments.thanks') }}</div>
        </div>
      </div>
      <p v-if="!isUserLoggedIn" class="login-message">
        {{ $t('comments.loginRequired') }}
      </p>
      <Comments :comments="comments" :commentLevel="1" :userVotes="userVotes" :replyId="-1"/>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store/store'
import Comments from '@/components/Comments.vue'
import CommentService from '@/services/CommentService'
import CommentUpvoteService from '@/services/CommentUpvoteService'

export default {
  name: 'CommentSystem',
  components: {
    Comments
  },
  props: {
    puzzleId: {
      type: [Number, String],
      required: true
    }
  },
  setup(props) {
    const store = useMainStore()
    const { isUserLoggedIn } = storeToRefs(store)
    
    const comments = ref([])
    const userVotes = ref([])
    const userComment = ref('')
    const commentSend = ref(false)

    const computedPuzzleId = computed(() => props.puzzleId)

    const loadUserUpvotes = async () => {
      userVotes.value = (await CommentUpvoteService.get()).data.map(m => m.CommentId)
    }

    const updateComments = async () => {
      comments.value = (await CommentService.show(props.puzzleId)).data
    }

    const sendCommentToDb = async (comment, replyId) => {
      const encodedComment = encodeURIComponent(comment)
      await CommentService.post(props.puzzleId, {
        text: encodedComment,
        replyId: replyId
      })
      await updateComments()
    }

    const sendComment = async () => {
      await sendCommentToDb(userComment.value, -1)
      commentSend.value = true
    }

    watch(computedPuzzleId, async () => {
      await updateComments()
      if (isUserLoggedIn.value) {
        await loadUserUpvotes()
      }
    })

    watch(isUserLoggedIn, async (newValue) => {
      if (newValue) {
        await loadUserUpvotes()
      }
    })

    onMounted(async () => {
      await updateComments()
      if (isUserLoggedIn.value) {
        await loadUserUpvotes()
      }
    })

    return {
      comments,
      userVotes,
      userComment,
      commentSend,
      isUserLoggedIn,
      sendComment
    }
  }
}
</script>

<style scoped>
.comment-area {
  margin-top: 30px;
  border-top: 1px solid #eee;
  padding-top: 20px;

  h3 {
    font-size: 18px;
    color: #333;
    margin-bottom: 15px;
  }

  .login-message {
    color: #666;
    font-style: italic;
  }
}

.comment-action-label {
  vertical-align: text-bottom;
  margin-left: 3px;
  cursor: pointer;
}

.comment-input {
  width: 100%;
  height: 75px;
  padding: 10px;
}

.divsend {
  position: relative;
  margin-top: 10px;
  padding-bottom: 10px;
}

.dankeBox {
  position: absolute;
  left: 50px;
  color: white;
  top: 7px;
  padding: 3px;
  border-radius: 4px;
  background-color: #1568a0;
}

.dankeBox:after {
  content: "";
  height: 0;
  width: 0;
  position: absolute;
  display: block;
  border-width: 6px 10px 6px 0;
  border-style: solid;
  border-color: transparent #1568a0;
  top: 7px;
  left: -10px;
}
</style>