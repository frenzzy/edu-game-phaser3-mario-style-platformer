class GameScene extends Phaser.Scene {
  platforms!: Phaser.Physics.Arcade.StaticGroup
  fires!: Phaser.Physics.Arcade.Group
  goal!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  barrels!: Phaser.Physics.Arcade.Group
  player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  playerSpeed!: number
  jumpSpeed!: number
  levelData!: {
    world: { width: number; height: number }
    spawner: { interval: number; speed: number; lifespan: number }
    player: { x: number; y: number }
    goal: { x: number; y: number }
    platforms: { x: number; y: number; numTiles: number; key: string }[]
    fires: { x: number; y: number }[]
  }

  constructor() {
    super('Game')
  }

  init() {
    this.playerSpeed = 150
    this.jumpSpeed = -600
  }

  preload() {
    this.load.image('ground', 'assets/images/ground.png')
    this.load.image('platform', 'assets/images/platform.png')
    this.load.image('block', 'assets/images/block.png')
    this.load.image('goal', 'assets/images/gorilla3.png')
    this.load.image('barrel', 'assets/images/barrel.png')

    this.load.spritesheet('player', 'assets/images/player_spritesheet.png', {
      frameWidth: 28,
      frameHeight: 30,
      margin: 1,
      spacing: 1,
    })

    this.load.spritesheet('fire', 'assets/images/fire_spritesheet.png', {
      frameWidth: 20,
      frameHeight: 21,
      margin: 1,
      spacing: 1,
    })

    this.load.json('levelData', 'assets/json/levelData.json')
  }

  create() {
    if (!this.anims.get('walking')) {
      this.anims.create({
        key: 'walking',
        frames: this.anims.generateFrameNames('player', {
          frames: [0, 1, 2],
        }),
        frameRate: 12,
        yoyo: true,
        repeat: -1,
      })
    }

    if (!this.anims.get('burning')) {
      this.anims.create({
        key: 'burning',
        frames: this.anims.generateFrameNames('fire', {
          frames: [0, 1],
        }),
        frameRate: 4,
        repeat: -1,
      })
    }

    this.setupLevel()

    this.setupSpawner()

    this.player.body.setCollideWorldBounds(true)
    this.physics.add.collider([this.player, this.goal], this.platforms)
    this.physics.add.collider(this.barrels, this.platforms)
    this.physics.add.overlap(
      this.player,
      [this.fires, this.barrels],
      this.restartGame,
      undefined,
      this,
    )
    this.physics.add.overlap(this.player, this.goal, this.restartGame, undefined, this)

    this.cursors = this.input.keyboard.createCursorKeys()

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      console.log(pointer.x, pointer.y)
    })
  }

  update() {
    const onGround = this.player.body.blocked.down || this.player.body.touching.down
    this.player.flipX = false
    if (this.cursors.left.isDown && !this.cursors.right.isDown) {
      this.player.body.setVelocityX(-this.playerSpeed)
      if (onGround && !this.player.anims.isPlaying) {
        this.player.anims.play('walking')
      }
    } else if (this.cursors.right.isDown && !this.cursors.left.isDown) {
      this.player.body.setVelocityX(this.playerSpeed)
      this.player.flipX = true
      if (onGround && !this.player.anims.isPlaying) {
        this.player.anims.play('walking')
      }
    } else {
      this.player.body.setVelocityX(0)
      this.player.anims.stop()
      if (onGround) {
        this.player.setFrame(3)
      }
    }

    if (onGround && (this.cursors.space.isDown || this.cursors.up.isDown)) {
      this.player.body.setVelocityY(this.jumpSpeed)
      this.player.anims.stop()
      this.player.setFrame(2)
    }
  }

  setupLevel() {
    this.levelData = this.cache.json.get('levelData')

    this.physics.world.bounds.width = this.levelData.world.width
    this.physics.world.bounds.height = this.levelData.world.height

    this.platforms = this.physics.add.staticGroup()
    for (const curr of this.levelData.platforms) {
      let newObj
      if (curr.numTiles === 1) {
        newObj = this.add.sprite(curr.x, curr.y, curr.key)
      } else {
        const { width, height } = this.textures.get(curr.key).get(0)
        newObj = this.add.tileSprite(curr.x, curr.y, curr.numTiles * width, height, curr.key)
      }
      newObj.setOrigin(0)
      this.physics.add.existing(newObj, true)
      this.platforms.add(newObj)
    }

    this.fires = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    })
    for (const curr of this.levelData.fires) {
      const newObj = this.add.sprite(curr.x, curr.y, 'fire').setOrigin(0)
      newObj.anims.play('burning')
      this.fires.add(newObj)

      // this is for level creation
      newObj.setInteractive()
      this.input.setDraggable(newObj)
    }

    // for level creation
    this.input.on(
      'drag',
      function (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.Sprite,
        dragX: number,
        dragY: number,
      ) {
        gameObject.x = dragX
        gameObject.y = dragY

        console.log(dragX, dragY)
      },
    )

    this.player = this.physics.add.sprite(
      this.levelData.player.x,
      this.levelData.player.y,
      'player',
      3,
    )

    this.cameras.main.setBounds(0, 0, this.levelData.world.width, this.levelData.world.height)
    this.cameras.main.startFollow(this.player)

    this.goal = this.physics.add.sprite(this.levelData.goal.x, this.levelData.goal.y, 'goal')
  }

  restartGame(
    sourceSprite: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    targetSprite: Phaser.Types.Physics.Arcade.GameObjectWithBody,
  ) {
    this.cameras.main.on('camerafadeoutcomplete', () => {
      this.scene.restart()
      this.cameras.main.fadeIn(500)
    })
    this.cameras.main.fade(500)
  }

  setupSpawner() {
    this.barrels = this.physics.add.group({
      bounceY: 0.1,
      bounceX: 1,
      collideWorldBounds: true,
    })

    const spawningEvent = this.time.addEvent({
      delay: this.levelData.spawner.interval,
      loop: true,
      callback: () => {
        const barrel = this.barrels.get(this.goal.x, this.goal.y, 'barrel')
        barrel.setActive(true)
        barrel.setVisible(true)
        barrel.setVelocityX(this.levelData.spawner.speed)
        this.time.addEvent({
          delay: this.levelData.spawner.lifespan,
          repeat: 0,
          callback: () => {
            this.barrels.killAndHide(barrel)
          },
        })
      },
    })
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 360,
  height: 640,
  scene: GameScene,
  title: 'Monster Kong',
  pixelArt: false,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1000 },
      debug: true,
    },
  },
})
