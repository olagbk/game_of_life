class Api::GamesController < ApplicationController

  def get_user
    login_token_value = request.headers["x-login-token"]
    user_token = LoginToken.find_by token: login_token_value
    @user = user_token.user
  end

  def index
    @games = Game.where({:user_id=>get_user})

    respond_to do |format|
      format.json { render :json => @games }
    end
  end

  def update
    @game = Game.find(params[:id])
    prms_game = params[:game].permit(:rows, :columns)

    @game.rows = prms_game[:rows]
    @game.columns = prms_game[:columns]
    @game.save!

    update_cells();

    respond_to do |format|
      format.json { render :json => @game.to_json(:include => :living_cells) }
    end

  end

  def create
    @game = Game.new(params[:game].permit(:rows, :columns, :name))
    @game.user = get_user
    @game.save!

    update_cells();

    respond_to do |format|
      format.json { render :json => @game.to_json(:include => :living_cells) }
    end



  end

  def destroy
    @game = Game.find(params[:id])
    if @game.user == get_user
      @game.destroy
    end

    @games = Game.where({:user_id=>get_user})
    respond_to do |format|
      format.json { render :json => @games }
    end
  end

  def show
    @game = Game.find(params[:id])
    if @game.user == get_user
      respond_to do |format|
        format.json { render :json => @game.to_json(:include => :living_cells) }
      end
    end
  end
end

def update_cells
  LivingCell.where({game_id: @game.id}).destroy_all


  cells = params[:living_cells]
  @living_cells = []
  if cells
    @living_cells = cells
  end

  to_import = []

  @living_cells.each_with_index do |pair, idx|
    coord_array = pair.last
    @cell = LivingCell.new({:row=>coord_array[0], :column=>coord_array[1]})
    @cell.game = @game
    to_import << @cell
  end

  LivingCell.import(to_import)
end