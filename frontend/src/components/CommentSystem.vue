<template>
  <div id="comment-area" class="comment-area">
    <div class="comments-container">
      <h2>Kommentare</h2>
      <div v-if="loggedIn">
        <textarea
          id="mainComment"
          class="comment-input"
          placeholder="Dein Kommentar..."
          v-model="userComment"
        ></textarea>
        <div class="divsend">
          <button @click="sendComment">
            <span>Kommentar abschicken</span>
            <ion-icon class="sendIcon" name="paper-plane-sharp"></ion-icon>
          </button>
          <div v-if="commentSend" class="dankeBox replyInactive">Danke für den Kommentar!</div>
        </div>
      </div>
      <span v-if="!loggedIn">Um einen Kommentar zu hinterlassen, müssen Sie sich einloggen.</span>
      <Comments :comments="comments" :commentLevel="1" :userVotes="userVotes" :replyId="-1"/>
    </div>
  </div>
</template>

<script>
import Comments from '@/components/Comments';
import CommentService from '@/services/CommentService';
import CommentUpvoteService from '@/services/CommentUpvoteService';

export default {
  name: "CommentSystem",
  props: {
    riddleType: {
      type: String,
      requires: true
    },
    riddleId: {
      type: String,
      requires: true
    }
  },
  components: {
    Comments: Comments
  },
  data() {
    return {
      comments: [],
      userVotes: [],
      userComment: "",
      commentSend: false
    };
  },
  watch: {
    async computedRiddleId() {
      this.updateComments();
      if (this.loggedIn) {
        await this.loadUserUpvotes();
      }
    },
    async loggedIn() {
      await this.loadUserUpvotes();
    }
  },
  async mounted() {
    this.updateComments();
    if (this.loggedIn) {
      await this.loadUserUpvotes();
    }
  },
  methods: {
    async loadUserUpvotes() {
      this.userVotes = (await CommentUpvoteService.get()).data.map(m => m.CommentsId);
    },
    async sendComment() {
      console.log("Send Comment");
      await this.sendCommentToDb(this.userComment, -1);
      this.commentSend = true;
    },
    async sendCommentToDb(userComment, replyId) {
      const encodedComment = encodeURIComponent(userComment);
      await CommentService.post(this.riddleType, this.riddleId, {
        text: encodedComment,
        replyId: replyId
      });
      this.updateComments();
    },
    commentUpvote(a) {
      console.log(a);
    },
    async updateComments() {
      this.comments = (await CommentService.show(this.riddleType, this.riddleId)).data;
    }
  },
  computed: {
    loggedIn() {
      return this.$store.state.isUserLoggedIn;
    },
    computedRiddleId() {
      return this.riddleId;
    }
  }
};
</script>

<style>
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
.sendIcon {
  width: 20px;
  height: 20px;
  float: right;
  margin-left: 5px;
}
.divsend {
  position: relative;
  margin-top: 10px;
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